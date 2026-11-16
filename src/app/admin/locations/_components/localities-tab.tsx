'use client';

import { useState, useMemo, useRef } from 'react';
import { LocationCombobox } from './location-combobox';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Upload, Download } from 'lucide-react';
import {
  useLocalitiesPaginated,
  useCreateLocality,
  useUpdateLocality,
  useDeleteLocality,
  useCountries,
  useStates,
  useCities,
} from '@/hooks/use-locations';
import { apiClient } from '@/lib/api-client';
import { queryClient, queryKeys } from '@/lib/query-client';
import { readCSVPreview, parseCSVFileInChunks } from './csv-utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  CommonTable,
  type CommonColumn,
} from '@/components/common/common-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DeleteDialog } from "@/components/common/delete-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageLoader } from '@/components/common/page-loader';
import { useTranslation } from '@/hooks/use-translation';
import type { Locality } from '@/types';
import { isApprovalRequired } from '@/lib/api-client';
import { toast } from '@/lib/toast';

// ─── Types ────────────────────────────────────────────────────────────────────

// Extended Locality type with nested district/state/country from API
type LocalityWithNested = Locality & {
  district?: {
    id: number;
    name: string;
    state_id?: number;
    country_id?: number;
    state?: {
      id: number;
      name: string;
      country_id?: number;
      country?: { id: number; name: string };
    };
  };
};

// ─── Schema ───────────────────────────────────────────────────────────────────

const localitySchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  pincode: z.string().trim().min(1, 'Pincode is required'),
  city_id: z.number({ required_error: 'District is required' }),
  is_active: z.boolean().default(true),
  is_default: z.boolean().default(false),
});

type LocalityForm = z.infer<typeof localitySchema>;

// Helper to extract nested fields from a row
function getDistrictName(loc: LocalityWithNested) {
  return loc.district?.name ?? '';
}
function getStateName(loc: LocalityWithNested) {
  return loc.district?.state?.name ?? '';
}
function getCountryName(loc: LocalityWithNested) {
  return loc.district?.state?.country?.name ?? '';
}
function getCountryId(loc: LocalityWithNested): number | null {
  return loc.district?.state?.country?.id ?? loc.district?.country_id ?? null;
}
function getStateId(loc: LocalityWithNested): number | null {
  return loc.district?.state?.id ?? loc.district?.state_id ?? null;
}

// ─── LocalitiesTab ────────────────────────────────────────────────────────────

export function LocalitiesTab() {
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filterCountryId, setFilterCountryId] = useState<string>('all');
  const [filterStateId, setFilterStateId] = useState<string>('all');
  const [filterDistrictId, setFilterDistrictId] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<LocalityWithNested | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Dialog cascade state
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);

  const [csvPreview, setCsvPreview] = useState<Record<string, string>[] | null>(null);
  const [csvTotalRows, setCsvTotalRows] = useState(0);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvProgress, setCsvProgress] = useState(0);
  const csvRef = useRef<HTMLInputElement>(null);

  const PAGE_SIZE = 20;
  const { data: pageData, isLoading } = useLocalitiesPaginated({
    page, limit: PAGE_SIZE, search: search || undefined,
    ...(filterDistrictId !== 'all'
      ? { city_id: Number(filterDistrictId) }
      : filterStateId !== 'all'
        ? { state_id: Number(filterStateId) }
        : filterCountryId !== 'all'
          ? { country_id: Number(filterCountryId) }
          : {}),
  });
  const localities = (pageData?.data ?? []) as LocalityWithNested[];
  const pagination = pageData?.pagination;

  const { data: countriesRaw = [] } = useCountries();
  const filterCountryIdNum = filterCountryId !== 'all' ? Number(filterCountryId) : undefined;
  const filterStateIdNum = filterStateId !== 'all' ? Number(filterStateId) : undefined;
  const { data: filterStatesRaw = [] } = useStates(filterCountryIdNum, true);
  const { data: filterDistrictsRaw = [] } = useCities(filterStateIdNum);
  const { data: dialogStatesRaw = [] } = useStates(selectedCountryId ?? undefined);
  const { data: dialogDistrictsRaw = [] } = useCities(selectedStateId ?? undefined);

  const countries = countriesRaw;

  const createLocality = useCreateLocality();
  const updateLocality = useUpdateLocality();
  const deleteLocality = useDeleteLocality();

  const form = useForm<LocalityForm>({
    resolver: zodResolver(localitySchema),
    defaultValues: { name: '', pincode: '', is_active: true, is_default: false },
  });

  // ── normalise function for CommonTable ──
  const normalise = (item: LocalityWithNested) => ({
    ...item,
    is_active: item.is_active,   // keep raw value (2 = pending)
    created_at: (item as any).createdAt ?? item.created_at ?? '',
    country_name: getCountryName(item),
    state_name: getStateName(item),
    district_name: getDistrictName(item),
  });

  // ── Filter dropdown cascading options ──────────────────────────────────────

  const filterStates = filterStatesRaw;
  const filterDistricts = filterDistrictsRaw;
  const dialogStates = dialogStatesRaw;
  const dialogDistricts = dialogDistrictsRaw;

  // ── Processed list ──────────────────────────────────────────────────────────

  const processedLocalities = useMemo(() => localities.map(normalise), [localities]);

  const columns: CommonColumn<any>[] = [
    {
      key: 'country_name',
      header: t('locations.country', 'Country'),
      sortable: true,
      render: (row) => (
        <span className="text-muted-foreground text-sm">
          {row.country_name || '–'}
        </span>
      ),
    },
    {
      key: 'state_name',
      header: t('locations.state', 'State'),
      sortable: true,
      render: (row) => (
        <span className="text-muted-foreground text-sm">
          {row.state_name || '–'}
        </span>
      ),
    },
    {
      key: 'district_name',
      header: t('locations.district', 'District'),
      sortable: true,
      render: (row) => (
        <span className="text-muted-foreground text-sm">
          {row.district_name || '–'}
        </span>
      ),
    },
    {
      key: 'name',
      header: t('locations.city_name', 'City Name'),
      sortable: true,
      render: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: 'pincode',
      header: t('locations.pincode', 'Pincode'),
      sortable: true,
      render: (row) => <span>{row.pincode}</span>,
    },
    {
      key: 'is_default',
      header: t('locations.default', 'Default'),
      render: (row) => (
        <Switch
          checked={Boolean(row.is_default)}
          onCheckedChange={(checked) => {
            if (checked)
              updateLocality.mutate({ id: row.id, data: { is_default: true } });
          }}
          disabled={
            Boolean(row.is_default) || !row.is_active || updateLocality.isPending
          }
        />
      ),
    },
  ];

  // ── Dialog helpers ───────────────────────────────────────────────────────────

  const closeDialog = () => {
    setDialogOpen(false);
    setEditItem(null);
    form.reset();
    setSelectedCountryId(null);
    setSelectedStateId(null);
  };

  const openCreate = () => {
    setEditItem(null);
    form.reset({ name: '', pincode: '', is_active: true, is_default: false });
    setSelectedCountryId(null);
    setSelectedStateId(null);
    setDialogOpen(true);
  };

  const openEdit = (loc: LocalityWithNested) => {
    if (Number(loc.is_active) === 2) return;
    setEditItem(loc);
    form.reset({
      name: loc.name,
      pincode: loc.pincode,
      city_id: loc.city_id,
      is_active: Number(loc.is_active) === 1,
      is_default: Boolean(loc.is_default),
    });
    const countryId = getCountryId(loc);
    const stateId = getStateId(loc);
    if (countryId) setSelectedCountryId(countryId);
    if (stateId) setSelectedStateId(stateId);
    setDialogOpen(true);
  };

  const onSubmit = (data: LocalityForm) => {
    // Check for duplicate pincode in same city
    const isDuplicate = localities.some(
      (loc) =>
        loc.city_id === data.city_id &&
        loc.pincode.trim().toLowerCase() === data.pincode.trim().toLowerCase() &&
        loc.id !== editItem?.id
    );
    if (isDuplicate) {
      form.setError('pincode', { message: 'This pincode already exists in the selected district' });
      return;
    }
    if (editItem) {
      updateLocality.mutate(
        { id: editItem.id, data },
        {
          onSuccess: closeDialog,
          onError: (e) => {
            if (isApprovalRequired(e)) closeDialog();
          },
        }
      );
    } else {
      createLocality.mutate(data, {
        onSuccess: closeDialog,
        onError: (e) => {
          if (isApprovalRequired(e)) closeDialog();
        },
      });
    }
  };

  const isPending = createLocality.isPending || updateLocality.isPending;

  // ── CSV helpers ──────────────────────────────────────────────────────────────

  function downloadSampleCSV() {
    const a = document.createElement('a');
    a.href = '/samples/sample_localities.csv';
    a.download = 'sample_localities.csv';
    a.click();
  }

  const handleCSVFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setCsvLoading(true);
    try {
      const { headers, rows, totalEstimate } = await readCSVPreview(file, 50);
      if (rows.length === 0 || !headers.length) {
        toast.error('No valid rows found in CSV');
        return;
      }
      setCsvFile(file);
      setCsvPreview(rows);
      setCsvTotalRows(totalEstimate);
      setCsvProgress(0);
    } catch {
      toast.error('Failed to read CSV file');
    } finally {
      setCsvLoading(false);
    }
  };

  const executeImport = async () => {
    if (!csvFile) return;
    setCsvImporting(true);
    setCsvProgress(0);

    const BATCH_SIZE = 3000;
    const CONCURRENCY = 5;
    let imported = 0, skipped = 0, invalidCount = 0;

    try {
      // Step 1: collect all valid rows (non-blocking)
      const allValid: Record<string, string>[] = [];
      await parseCSVFileInChunks(csvFile, async (batch) => {
        const valid = batch.filter((r) => r.name && r.pincode && (r.district_name || r.district_id));
        invalidCount += batch.length - valid.length;
        allValid.push(...valid);
      }, 20000);

      // Step 2: split into batches
      const batches: Record<string, string>[][] = [];
      for (let i = 0; i < allValid.length; i += BATCH_SIZE) {
        batches.push(allValid.slice(i, i + BATCH_SIZE));
      }

      // Step 3: fire CONCURRENCY requests at a time
      for (let i = 0; i < batches.length; i += CONCURRENCY) {
        const group = batches.slice(i, i + CONCURRENCY);
        const results = await Promise.all(
          group.map((b) => apiClient.post('/locations/cities/bulk', { rows: b })),
        );
        results.forEach((res) => {
          imported += res.data?.data?.imported ?? 0;
          skipped += res.data?.data?.skipped ?? 0;
        });
        setCsvProgress(Math.round(((i + group.length) / batches.length) * 100));
      }

      setCsvProgress(100);
      await queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
      toast.success(`Imported ${imported} cities`);
      if (skipped + invalidCount > 0) toast.warning(`${skipped + invalidCount} rows skipped`);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      toast.error(err.response?.data?.message || 'Bulk import failed');
    }
    setCsvImporting(false);
    setCsvPreview(null);
    setCsvFile(null);
    setCsvProgress(0);
  };

  return (
    <>
      <PageLoader open={isLoading || isPending || deleteLocality.isPending || csvLoading || csvImporting} />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle>{t('locations.cities', 'Cities')}</CardTitle>
              <CardDescription>
                {t(
                  'locations.cities_desc',
                  'Manage cities linked to districts'
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleCSVFile} />
              <Button size="sm" variant="outline" onClick={downloadSampleCSV}>
                <Download className="mr-2 h-4 w-4" /> Sample CSV
              </Button>
              <Button size="sm" variant="outline" onClick={() => csvRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" /> Import CSV
              </Button>
              <Button size="sm" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />{' '}
                {t('locations.add_city', 'Add City')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* ── Filters ── */}
          <div className="mb-4 flex gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t(
                  'locations.search_city',
                  'Search city, district, state or country...'
                )}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-8"
              />
            </div>

            {/* Country filter */}
            <LocationCombobox
              items={countries}
              value={filterCountryId}
              onValueChange={(v) => { setFilterCountryId(v); setFilterStateId('all'); setFilterDistrictId('all'); setPage(1); }}
              allLabel={t('locations.all_countries', 'All Countries')}
              placeholder="Search country..."
            />

            {/* State filter */}
            <LocationCombobox
              items={filterStates}
              value={filterStateId}
              onValueChange={(v) => { setFilterStateId(v); setFilterDistrictId('all'); setPage(1); }}
              allLabel={t('locations.all_states', 'All States')}
              placeholder="Search state..."
              disabled={filterCountryId === 'all'}
            />

            {/* District filter */}
            <LocationCombobox
              items={filterDistricts}
              value={filterDistrictId}
              onValueChange={(v) => { setFilterDistrictId(v); setPage(1); }}
              allLabel={t('locations.all_districts', 'All Districts')}
              placeholder="Search district..."
              disabled={filterStateId === 'all'}
            />
          </div>

          <CommonTable
            columns={columns}
            data={processedLocalities}
            isLoading={isLoading}
            onStatusToggle={(row, val) =>
              updateLocality.mutate({ id: row.id, data: { is_active: val ? 1 : 0 } })
            }
            onEdit={openEdit}
            onDelete={(row) => setDeleteId(row.id)}
            disableStatusToggle={(row) => Number(row.is_active) === 2 || !!row.has_pending_approval}
            disableEdit={(row) => Number(row.is_active) === 2 || !!row.has_pending_approval}
            disableDelete={(row) => Number(row.is_active) === 2 || !!row.has_pending_approval}
            emptyMessage={t('locations.no_cities_found', 'No cities found')}
            showStatus
            showCreated
            showActions
            pagination={pagination ? {
              page: pagination.page,
              totalPages: pagination.totalPages,
              totalItems: pagination.totalItems,
              pageSize: PAGE_SIZE,
              onPageChange: setPage,
            } : undefined}
          />
        </CardContent>
      </Card>

      {/* ── CSV Preview Dialog ── */}
      {csvPreview && (
        <Dialog open={!!csvPreview} onOpenChange={(open) => { if (!open && !csvImporting) { setCsvPreview(null); setCsvFile(null); setCsvProgress(0); } }}>
          <DialogContent className="max-w-4xl flex flex-col overflow-y-hidden" style={{ maxHeight: '85vh' }}>
            <DialogHeader>
              <DialogTitle>Preview Import — ~{csvTotalRows.toLocaleString()} cities</DialogTitle>
              <DialogDescription>
                Showing first {csvPreview.length} rows.{csvTotalRows > csvPreview.length ? ` File contains ~${csvTotalRows.toLocaleString()} total rows.` : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-auto flex-1 border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-muted-foreground">#</TableHead>
                    {Object.keys(csvPreview[0] || {}).map((col) => (
                      <TableHead key={col} className="whitespace-nowrap font-medium">{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvPreview.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground text-xs tabular-nums">{i + 1}</TableCell>
                      {Object.entries(row).map(([col, val], j) => (
                        <TableCell key={j} className="whitespace-nowrap text-sm">
                          {col === 'is_active' ? (
                            <Badge className={val === '1' ? 'bg-green-100 text-green-700 border border-green-300 hover:bg-green-100' : 'bg-muted text-muted-foreground border'}>
                              {val === '1' ? 'Active' : 'Inactive'}
                            </Badge>
                          ) : col === 'pincode' ? (
                            <span className="tabular-nums font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{val}</span>
                          ) : val || <span className="text-muted-foreground">–</span>}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {csvImporting && (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Importing…</span>
                  <span>{csvProgress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${csvProgress}%` }}
                  />
                </div>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t">
              <p className="text-sm text-muted-foreground">~{csvTotalRows.toLocaleString()} total rows to import</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setCsvPreview(null); setCsvFile(null); }} isLoading={csvImporting}>Cancel</Button>
                <Button onClick={executeImport} isLoading={csvImporting}>
                  {csvImporting ? `Importing… ${csvProgress}%` : `Import ~${csvTotalRows.toLocaleString()} rows`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Add / Edit Dialog ── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editItem
                ? t('locations.edit_city', 'Edit City')
                : t('locations.add_city', 'Add City')}
            </DialogTitle>
            <DialogDescription>
              {editItem
                ? t('locations.edit_city_desc', 'Update city details.')
                : t(
                  'locations.add_city_desc',
                  'Fill in details to create a new city.'
                )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Country */}
            <div className="space-y-2">
              <Label>{t('locations.country', 'Country')} <span className="text-destructive">*</span></Label>
              <Select
                value={selectedCountryId?.toString() ?? ''}
                onValueChange={(v) => {
                  setSelectedCountryId(parseInt(v));
                  setSelectedStateId(null);
                  form.setValue('city_id', undefined as unknown as number);
                }}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t('locations.select_country', 'Select country...')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* State */}
            <div className="space-y-2">
              <Label>{t('locations.state', 'State')} <span className="text-destructive">*</span></Label>
              <Select
                value={selectedStateId?.toString() ?? ''}
                onValueChange={(v) => {
                  setSelectedStateId(parseInt(v));
                  form.setValue('city_id', undefined as unknown as number);
                }}
                disabled={!selectedCountryId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t('locations.select_state', 'Select state...')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {dialogStates.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* District */}
            <div className="space-y-2">
              <Label>{t('locations.district', 'District')} <span className="text-destructive">*</span></Label>
              <Controller
                control={form.control}
                name="city_id"
                render={({ field }) => (
                  <Select
                    value={field.value?.toString() ?? ''}
                    onValueChange={(v) => field.onChange(parseInt(v))}
                    disabled={!selectedStateId && !selectedCountryId}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t(
                          'locations.select_district',
                          'Select district...'
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {dialogDistricts.map((d) => (
                        <SelectItem key={d.id} value={d.id.toString()}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.city_id && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.city_id.message}
                </p>
              )}
            </div>

            {/* City Name */}
            <div className="space-y-2">
              <Label htmlFor="loc-name">
                {t('locations.city_name', 'City Name')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="loc-name"
                placeholder={t(
                  'locations.city_name_placeholder',
                  'e.g. Andheri West'
                )}
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            {/* Pincode */}
            <div className="space-y-2">
              <Label htmlFor="loc-pincode">
                {t('locations.pincode', 'Pincode')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="loc-pincode"
                placeholder="400053"
                {...form.register('pincode')}
              />
              {form.formState.errors.pincode && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.pincode.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between border rounded-lg p-3">
              <Label htmlFor="loc-active">
                {t('locations.is_active', 'Is Active?')}
              </Label>
              <Controller
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <Switch
                    id="loc-active"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>

            <div className="flex items-center justify-between border rounded-lg p-3">
              <Label htmlFor="loc-default">
                {t('locations.is_default', 'Is Default?')}
              </Label>
              <Controller
                control={form.control}
                name="is_default"
                render={({ field }) => (
                  <Switch
                    id="loc-default"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" isLoading={isPending}>
                {isPending
                  ? t('common.saving', 'Saving...')
                  : editItem
                    ? t('locations.update_city', 'Update City')
                    : t('locations.create_city', 'Create City')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <DeleteDialog
        open={!!deleteId}
        onOpenChange={(open: boolean) => { if (!open) setDeleteId(null); }}
        title={t('common.are_you_sure', 'Are you sure?')}
        description={t('common.cannot_undo', 'This action cannot be undone.')}
        isDeleting={deleteLocality.isPending}
        onConfirm={() => {
          if (deleteId) {
            deleteLocality.mutate(deleteId, {
              onSuccess: () => setDeleteId(null),
              onError: () => setDeleteId(null)
            });
          }
        }}
      />
    </>
  );
}
