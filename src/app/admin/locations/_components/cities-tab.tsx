"use client";

import { useState, useMemo, useRef } from "react";
import { LocationCombobox } from './location-combobox';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Upload, Download } from "lucide-react";
import {
  CommonTable,
  type CommonColumn,
} from "@/components/common/common-table";
import {
  useDistrictsPaginated, useCreateCity, useUpdateCity, useDeleteCity,
  useStates, useCountries,
} from "@/hooks/use-locations";
import { apiClient, isApprovalRequired } from "@/lib/api-client";
import { queryClient, queryKeys } from "@/lib/query-client";
import { readCSVPreview, parseCSVFileInChunks } from "./csv-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { DeleteDialog } from "@/components/common/delete-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageLoader } from "@/components/common/page-loader";
import { useTranslation } from "@/hooks/use-translation";
import type { City } from "@/types";
import { toast } from "@/lib/toast";

// ─── Schema ───────────────────────────────────────────────────────────────────

const citySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  state_id: z.number({ required_error: "State is required" }),
  country_id: z.number({ required_error: "Country is required" }),
  slug: z.string().optional(),
  sort_order: z.number().default(0),
  is_active: z.boolean().default(true),
  is_default: z.boolean().default(false),
});

type CityForm = z.infer<typeof citySchema>;


// ─── CSV helpers ──────────────────────────────────────────────────────────────

function downloadSampleCSV() {
  const a = document.createElement("a");
  a.href = "/samples/sample_cities.csv";
  a.download = "sample_cities.csv";
  a.click();
}

// ─── CitiesTab ────────────────────────────────────────────────────────────────

export function CitiesTab() {
  const { t } = useTranslation();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filterCountryId, setFilterCountryId] = useState<string>("all");
  const [filterStateId, setFilterStateId] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<City | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [csvPreview, setCsvPreview] = useState<Record<string, string>[] | null>(null);
  const [csvTotalRows, setCsvTotalRows] = useState(0);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvProgress, setCsvProgress] = useState(0);
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);
  const csvRef = useRef<HTMLInputElement>(null);

  const PAGE_SIZE = 20;
  const { data: pageData, isLoading } = useDistrictsPaginated({
    page, limit: PAGE_SIZE, search: search || undefined,
    ...(filterStateId !== "all"
      ? { state_id: Number(filterStateId) }
      : filterCountryId !== "all"
        ? { country_id: Number(filterCountryId) }
        : {}),
  });
  const cities = pageData?.data ?? [];
  const pagination = pageData?.pagination;
  const { data: countriesRaw = [] } = useCountries();
  const filterCountryIdNum = filterCountryId !== "all" ? Number(filterCountryId) : undefined;
  const { data: filterStates = [] } = useStates(filterCountryIdNum, true);
  const { data: dialogStates = [] } = useStates(selectedCountryId ?? undefined);
  const countries = countriesRaw;
  const createCity = useCreateCity();
  const updateCity = useUpdateCity();
  const deleteCity = useDeleteCity();

  const form = useForm<CityForm>({
    resolver: zodResolver(citySchema),
    defaultValues: { name: "", slug: "", sort_order: 0, is_active: true, is_default: false },
  });

  const getCityCountryName = (city: City): string =>
    city.country?.name ?? city.state?.country?.name ??
    countries.find((c) => c.id === city.country_id)?.name ?? "–";

  const normalise = (item: City) => ({
    ...item,
    is_active: item.is_active,   // keep raw value (2 = pending)
    created_at: (item as any).createdAt ?? item.created_at ?? "",
    state_name: item.state?.name ?? "–",
    country_name: getCityCountryName(item),
  });

  const processedCities = useMemo(() => cities.map(normalise), [cities]);

  const columns: CommonColumn<any>[] = [
    {
      key: "name",
      header: t("common.name", "Name"),
      sortable: true,
      render: (row) => <span className="font-medium text-sm">{row.name}</span>,
    },
    {
      key: "state_name",
      header: t("locations.state", "State"),
      sortable: true,
      render: (row) => <span className="text-xs text-muted-foreground">{row.state_name}</span>,
    },
    {
      key: "country_name",
      header: t("locations.country", "Country"),
      sortable: true,
      render: (row) => <span className="text-xs text-muted-foreground">{row.country_name}</span>,
    },
    {
      key: "sort_order",
      header: t("locations.sort_order", "Order"),
      sortable: true,
      render: (row) => <span className="text-xs text-muted-foreground">{row.sort_order}</span>,
    },
    {
      key: "is_default",
      header: t("locations.default", "Default"),
      render: (row) => (
        <Switch
          checked={Boolean(row.is_default)}
          onCheckedChange={(checked) => { if (checked) updateCity.mutate({ id: row.id, data: { is_default: true } }); }}
          disabled={Boolean(row.is_default) || !row.is_active || updateCity.isPending}
        />
      ),
    },
  ];

  const closeDialog = () => {
    setDialogOpen(false); setEditItem(null); form.reset(); setSelectedCountryId(null);
  };

  const openCreate = () => {
    setEditItem(null);
    form.reset({ name: "", slug: "", sort_order: 0, is_active: true, is_default: false });
    setSelectedCountryId(null);
    setDialogOpen(true);
  };

  const openEdit = (city: City) => {
    if (Number(city.is_active) === 2) return;
    setEditItem(city);
    form.reset({
      name: city.name, state_id: city.state_id,
      country_id: city.country_id ?? undefined,
      slug: city.slug ?? "", sort_order: city.sort_order,
      is_active: Number(city.is_active) === 1, is_default: Boolean(city.is_default),
    });
    if (city.country_id) setSelectedCountryId(city.country_id);
    setDialogOpen(true);
  };

  const onSubmit = (data: CityForm) => {
    if (editItem) {
      updateCity.mutate({ id: editItem.id, data }, {
        onSuccess: closeDialog,
        onError: (e) => { if (isApprovalRequired(e)) closeDialog(); },
      });
    } else {
      createCity.mutate(data, {
        onSuccess: closeDialog,
        onError: (e) => { if (isApprovalRequired(e)) closeDialog(); },
      });
    }
  };

  const handleCSVFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setCsvLoading(true);
    try {
      // Only parse first 50 rows for preview — avoids freezing on 150k row file
      const { rows, totalEstimate } = await readCSVPreview(file, 50);
      if (rows.length === 0) { toast.error("No valid rows found in CSV"); return; }
      setCsvFile(file);
      setCsvPreview(rows);
      setCsvTotalRows(totalEstimate);
      setCsvProgress(0);
    } catch {
      toast.error("Failed to read CSV file");
    } finally {
      setCsvLoading(false);
    }
  };

  const executeImport = async () => {
    if (!csvFile) return;
    setCsvImporting(true);
    setCsvProgress(0);

    const BATCH_SIZE = 3000;
    const CONCURRENCY = 5; // parallel requests at a time
    let imported = 0, skipped = 0;

    try {
      // Step 1: collect all valid rows from CSV (non-blocking)
      const allValid: Record<string, string>[] = [];
      await parseCSVFileInChunks(csvFile, async (batch) => {
        allValid.push(...batch.filter((r) => r.name && (r.state_code || r.state_id)));
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
          group.map((b) => apiClient.post("/locations/districts/bulk", { rows: b })),
        );
        results.forEach((res) => {
          imported += res.data?.data?.imported ?? 0;
          skipped += res.data?.data?.skipped ?? 0;
        });
        setCsvProgress(Math.round(((i + group.length) / batches.length) * 100));
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
      toast.success(`Imported ${imported} districts`);
      if (skipped > 0) toast.warning(`${skipped} rows skipped (state not found)`);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      toast.error(err.response?.data?.message || "Bulk import failed");
    }
    setCsvImporting(false);
    setCsvPreview(null);
    setCsvFile(null);
    setCsvProgress(0);
  };

  const isPending = createCity.isPending || updateCity.isPending;

  return (
    <>
      <PageLoader open={(isLoading || isPending || deleteCity.isPending) && !csvImporting} />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle>{t("locations.districts", "Districts")}</CardTitle>
              <CardDescription>{t("locations.districts_desc", "Manage district records")}</CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleCSVFile} />
              <Button size="sm" variant="outline" onClick={downloadSampleCSV}>
                <Download className="mr-2 h-4 w-4" /> {t("locations.sample_csv", "Sample CSV")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => csvRef.current?.click()} disabled={csvLoading}>
                <Upload className="mr-2 h-4 w-4" /> {csvLoading ? "Reading..." : t("locations.import_csv", "Import CSV")}
              </Button>
              <Button size="sm" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> {t("locations.add_district", "Add District")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("locations.search_district", "Search by name, state or country...")}
                value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-8"
              />
            </div>
            <LocationCombobox
              items={countries}
              value={filterCountryId}
              onValueChange={(v) => { setFilterCountryId(v); setFilterStateId("all"); setPage(1); }}
              allLabel={t("locations.all_countries", "All Countries")}
              placeholder="Search country..."
            />
            <LocationCombobox
              items={filterStates}
              value={filterStateId}
              onValueChange={(v) => { setFilterStateId(v); setPage(1); }}
              allLabel={t("locations.all_states", "All States")}
              placeholder="Search state..."
            />
          </div>

          <CommonTable
            columns={columns}
            data={processedCities as any}
            isLoading={isLoading}
            onStatusToggle={(row, val) => updateCity.mutate({ id: row.id, data: { is_active: val ? 1 : 0 } })}
            onEdit={openEdit}
            onDelete={(row) => setDeleteId(row.id)}
            disableStatusToggle={(row) => Number(row.is_active) === 2 || !!row.has_pending_approval}
            disableEdit={(row) => Number(row.is_active) === 2 || !!row.has_pending_approval}
            disableDelete={(row) => Number(row.is_active) === 2 || !!row.has_pending_approval}
            emptyMessage={t("locations.no_districts_found", "No districts found")}
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

      {/* CSV Preview Dialog */}
      {csvPreview && (
        <Dialog open={!!csvPreview} onOpenChange={(open) => { if (!open && !csvImporting) { setCsvPreview(null); setCsvFile(null); } }}>
          <DialogContent className="max-w-3xl flex flex-col overflow-y-hidden" style={{ maxHeight: '85vh' }}>
            <DialogHeader>
              <DialogTitle>Preview Import — {csvTotalRows.toLocaleString()} districts</DialogTitle>
              <DialogDescription>
                Showing first {csvPreview.length} rows of ~{csvTotalRows.toLocaleString()} total.
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-auto flex-1 border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8 text-muted-foreground">#</TableHead>
                    {Object.keys(csvPreview[0] ?? {}).map((k) => <TableHead key={k}>{k}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvPreview.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">{i + 1}</TableCell>
                      {Object.values(row).map((v, j) => <TableCell key={j} className="text-sm whitespace-nowrap">{v || <span className="text-muted-foreground">–</span>}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {csvImporting && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Importing...</span>
                  <span>{csvProgress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${csvProgress}%` }} />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t">
              <p className="text-sm text-muted-foreground">~{csvTotalRows.toLocaleString()} rows to import</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setCsvPreview(null); setCsvFile(null); }} isLoading={csvImporting}>Cancel</Button>
                <Button onClick={executeImport} isLoading={csvImporting}>
                  {csvImporting ? `Importing... ${csvProgress}%` : `Import ~${csvTotalRows.toLocaleString()} rows`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? t("locations.edit_district", "Edit District") : t("locations.add_district", "Add District")}</DialogTitle>
            <DialogDescription>
              {editItem ? t("locations.edit_district_desc", "Update district details.") : t("locations.add_district_desc", "Fill in details to create a new district.")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("locations.country", "Country")} <span className="text-destructive">*</span></Label>
              <Controller control={form.control} name="country_id" render={({ field }) => (
                <Select value={field.value?.toString() || selectedCountryId?.toString()}
                  onValueChange={(v) => { const id = parseInt(v); field.onChange(id); setSelectedCountryId(id); form.setValue("state_id", undefined as unknown as number); }}>
                  <SelectTrigger><SelectValue placeholder={t("locations.select_country", "Select country...")} /></SelectTrigger>
                  <SelectContent>{countries.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              )} />
              {form.formState.errors.country_id && <p className="text-sm text-destructive">{form.formState.errors.country_id.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>{t("locations.state", "State")} <span className="text-destructive">*</span></Label>
              <Controller control={form.control} name="state_id" render={({ field }) => (
                <Select value={field.value?.toString()} onValueChange={(v) => field.onChange(parseInt(v))}
                  disabled={!selectedCountryId && !form.getValues("country_id")}>
                  <SelectTrigger><SelectValue placeholder={t("locations.select_state", "Select state...")} /></SelectTrigger>
                  <SelectContent>{dialogStates.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              )} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ci-name">{t("common.name", "Name")} <span className="text-destructive">*</span></Label>
              <Input id="ci-name" placeholder={t("locations.district_placeholder", "e.g. Chennai North")} {...form.register("name")} />
              {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ci-slug">{t("locations.slug", "Slug")}</Label>
              <Input id="ci-slug" placeholder="chennai-north" {...form.register("slug")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ci-sort">{t("locations.sort_order", "Sort Order")}</Label>
              <Input id="ci-sort" type="number" {...form.register("sort_order", { valueAsNumber: true })} />
            </div>

            <div className="flex items-center justify-between border rounded-lg p-3">
              <Label htmlFor="ci-active">{t("locations.is_active", "Is Active?")}</Label>
              <Controller control={form.control} name="is_active" render={({ field }) => (
                <Switch id="ci-active" checked={field.value} onCheckedChange={field.onChange} />
              )} />
            </div>

            <div className="flex items-center justify-between border rounded-lg p-3">
              <Label htmlFor="ci-default">{t("locations.is_default", "Is Default?")}</Label>
              <Controller control={form.control} name="is_default" render={({ field }) => (
                <Switch id="ci-default" checked={field.value} onCheckedChange={field.onChange} />
              )} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog}>{t("common.cancel", "Cancel")}</Button>
              <Button type="submit" isLoading={isPending}>
                {isPending ? t("common.saving", "Saving...") : editItem ? t("locations.update_district", "Update District") : t("locations.create_district", "Create District")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <DeleteDialog
        open={!!deleteId}
        onOpenChange={(open: boolean) => { if (!open) setDeleteId(null); }}
        title={t("common.are_you_sure", "Are you sure?")}
        description={`${t("common.delete_confirm", "Are you sure you want to delete this?")} ${t("common.cannot_undo", "This action cannot be undone.")}`}
        isDeleting={deleteCity.isPending}
        onConfirm={() => {
          if (deleteId) {
            deleteCity.mutate(deleteId, {
              onSuccess: () => setDeleteId(null),
              onError: () => setDeleteId(null),
            });
          }
        }}
      />
    </>
  );
}
