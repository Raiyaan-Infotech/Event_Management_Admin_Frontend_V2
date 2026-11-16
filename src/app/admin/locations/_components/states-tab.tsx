"use client";

import { useState, useMemo, useRef } from "react";
import { LocationCombobox } from './location-combobox';
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Upload,
  Download,
} from "lucide-react";
import {
  useStatesPaginated,
  useCreateState,
  useUpdateState,
  useDeleteState,
  useCountries,
} from "@/hooks/use-locations";
import { apiClient, isApprovalRequired } from "@/lib/api-client";
import { queryClient, queryKeys } from "@/lib/query-client";
import { parseCSV, chunkArray } from "./csv-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  CommonTable,
  type CommonColumn,
} from "@/components/common/common-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeleteDialog } from "@/components/common/delete-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { State } from "@/types";
import { toast } from "@/lib/toast";
import { PageLoader } from "@/components/common/page-loader";

// ─── Schema ──────────────────────────────────────────────────────────────────

const stateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  code: z.string().optional(),
  slug: z.string().optional(),
  country_id: z.number({ required_error: "Country is required" }),
  sort_order: z.number().default(0),
  is_active: z.boolean().default(true),
  is_default: z.boolean().default(false),
});

type StateForm = z.infer<typeof stateSchema>;


// ─── CSV helpers ──────────────────────────────────────────────────────────────

function downloadSampleCSV() {
  const a = document.createElement("a");
  a.href = "/samples/sample_states.csv";
  a.download = "sample_states.csv";
  a.click();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StatesTab() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filterCountryId, setFilterCountryId] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<State | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [csvPreview, setCsvPreview] = useState<Record<string, string>[] | null>(
    null,
  );
  const [csvImporting, setCsvImporting] = useState(false);
  const csvRef = useRef<HTMLInputElement>(null);

  const PAGE_SIZE = 20;
  const { data: pageData, isLoading } = useStatesPaginated({
    page, limit: PAGE_SIZE, search: search || undefined,
    ...(filterCountryId !== "all" ? { country_id: Number(filterCountryId) } : {}),
  });
  const states = pageData?.data ?? [];
  const pagination = pageData?.pagination;
  const { data: countriesRaw = [] } = useCountries();
  const countries = useMemo(() => countriesRaw.filter((c) => Boolean(c.is_active)), [countriesRaw]);
  const createState = useCreateState();
  const updateState = useUpdateState();
  const deleteState = useDeleteState();

  const form = useForm<StateForm>({
    resolver: zodResolver(stateSchema),
    defaultValues: {
      name: "",
      code: "",
      slug: "",
      sort_order: 0,
      is_active: true,
      is_default: false,
    },
  });

  // ── normalise function for CommonTable ──
  const normalise = (item: State) => ({
    ...item,
    is_active: item.is_active,   // keep raw value (2 = pending)
    created_at: (item as any).createdAt ?? item.created_at ?? "",
    country_name: item.country?.name ?? "",
  });

  const processedStates = useMemo(() => states.map(normalise), [states]);

  const columns: CommonColumn<any>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (row) => <span className="font-medium text-sm">{row.name}</span>,
    },
    {
      key: "code",
      header: "Code",
      sortable: true,
      render: (row) => row.code ? <Badge variant="outline" className="text-[10px]">{row.code}</Badge> : "–",
    },
    {
      key: "country_name",
      header: "Country",
      sortable: true,
      render: (row) => <span className="text-xs text-muted-foreground">{row.country?.name ?? "–"}</span>,
    },
    {
      key: "sort_order",
      header: "Order",
      sortable: true,
      render: (row) => <span className="text-xs text-muted-foreground">{row.sort_order}</span>,
    },
    {
      key: "is_default",
      header: "Default",
      render: (row) => (
        <Switch
          checked={Boolean(row.is_default)}
          onCheckedChange={(checked) => {
            if (checked) updateState.mutate({ id: row.id, data: { is_default: true } });
          }}
          disabled={Boolean(row.is_default) || !row.is_active || updateState.isPending}
        />
      ),
    },
  ];

  // ── Dialog ──

  const closeDialog = () => {
    setDialogOpen(false);
    setEditItem(null);
    form.reset();
  };

  const openCreate = () => {
    setEditItem(null);
    form.reset({
      name: "",
      code: "",
      slug: "",
      sort_order: 0,
      is_active: true,
      is_default: false,
    });
    setDialogOpen(true);
  };

  const openEdit = (state: State) => {
    if (Number(state.is_active) === 2) return;
    setEditItem(state);
    form.reset({
      name: state.name,
      code: state.code ?? "",
      slug: state.slug ?? "",
      country_id: state.country_id,
      sort_order: state.sort_order,
      is_active: Number(state.is_active) === 1,
      is_default: Boolean(state.is_default),
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: StateForm) => {
    if (editItem) {
      updateState.mutate(
        { id: editItem.id, data },
        {
          onSuccess: closeDialog,
          onError: (e) => {
            if (isApprovalRequired(e)) closeDialog();
          },
        },
      );
    } else {
      createState.mutate(data, {
        onSuccess: closeDialog,
        onError: (e) => {
          if (isApprovalRequired(e)) closeDialog();
        },
      });
    }
  };

  // ── CSV ──

  const handleCSVFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const rows = parseCSV(await file.text());
    if (rows.length === 0) {
      toast.error("No valid rows found in CSV");
      e.target.value = "";
      return;
    }
    setCsvPreview(rows);
    e.target.value = "";
  };

  const executeImport = async () => {
    if (!csvPreview) return;
    setCsvImporting(true);
    toast.info(`Importing ${csvPreview.length} states...`, { duration: 3000 });

    const valid = csvPreview.filter((r) => r.name && (r.country_code || r.country_id));
    const invalidCount = csvPreview.length - valid.length;

    try {
      const BATCH = 500;
      const chunks = chunkArray(valid, BATCH);
      let imported = 0, skipped = 0;
      for (const chunk of chunks) {
        const res = await apiClient.post("/locations/states/bulk", { rows: chunk });
        imported += res.data?.data?.imported ?? 0;
        skipped += res.data?.data?.skipped ?? 0;
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
      toast.success(`Imported ${imported} states`);
      if (skipped + invalidCount > 0) toast.warning(`${skipped + invalidCount} rows skipped`);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      toast.error(err.response?.data?.message || "Bulk import failed");
    }
    setCsvImporting(false);
    setCsvPreview(null);
  };

  const isPending = createState.isPending || updateState.isPending;

  return (
    <>
      <PageLoader open={isLoading || isPending || deleteState.isPending || csvImporting} />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle>States</CardTitle>
              <CardDescription>Manage state records</CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                ref={csvRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleCSVFile}
              />
              <Button size="sm" variant="outline" onClick={downloadSampleCSV}>
                <Download className="mr-2 h-4 w-4" /> Sample CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => csvRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" /> Import CSV
              </Button>
              <Button size="sm" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> Add State
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, code or country..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-8"
              />
            </div>
            <LocationCombobox
              items={countries}
              value={filterCountryId}
              onValueChange={(v) => { setFilterCountryId(v); setPage(1); }}
              allLabel="All Countries"
              placeholder="Search country..."
            />
          </div>

          <CommonTable
            columns={columns}
            data={processedStates as any}
            isLoading={isLoading}
            onStatusToggle={(row, val) => updateState.mutate({ id: row.id, data: { is_active: val ? 1 : 0 } })}
            onEdit={openEdit}
            onDelete={(row) => setDeleteId(row.id)}
            disableStatusToggle={(row) => Number(row.is_active) === 2 || !!row.has_pending_approval}
            disableEdit={(row) => Number(row.is_active) === 2 || !!row.has_pending_approval}
            disableDelete={(row) => Number(row.is_active) === 2 || !!row.has_pending_approval}
            emptyMessage="No states found"
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

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit State" : "Add State"}</DialogTitle>
            <DialogDescription>
              {editItem
                ? "Update state details."
                : "Fill in details to create a new state."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Country First */}
            <div className="space-y-2">
              <Label>Country <span className="text-destructive">*</span></Label>
              <Controller
                control={form.control}
                name="country_id"
                render={({ field }) => (
                  <Select
                    value={field.value?.toString()}
                    onValueChange={(v) => field.onChange(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country..." />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.country_id && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.country_id.message}
                </p>
              )}
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="s-name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="s-name"
                placeholder="Tamil Nadu"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            {/* Slug */}
            <div className="space-y-2">
              <Label htmlFor="s-slug">Slug</Label>
              <Input
                id="s-slug"
                placeholder="tamil-nadu"
                {...form.register("slug")}
              />
            </div>

            {/* Abbreviation */}
            <div className="space-y-2">
              <Label htmlFor="s-code">Abbreviation</Label>
              <Input
                id="s-code"
                placeholder="E.g: TN"
                {...form.register("code")}
              />
            </div>

            {/* Sort Order */}
            <div className="space-y-2">
              <Label htmlFor="s-sort">Sort Order</Label>
              <Input
                id="s-sort"
                type="number"
                {...form.register("sort_order", { valueAsNumber: true })}
              />
            </div>

            {/* Is Active */}
            <div className="flex items-center justify-between border rounded-lg p-3">
              <Label htmlFor="s-active">Is Active?</Label>
              <Controller
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <Switch
                    id="s-active"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>

            {/* Is Default */}
            <div className="flex items-center justify-between border rounded-lg p-3">
              <Label htmlFor="s-default">Is Default?</Label>
              <Controller
                control={form.control}
                name="is_default"
                render={({ field }) => (
                  <Switch
                    id="s-default"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>

            {/* Submit */}
            <Button type="submit" className="w-full" isLoading={isPending}>
              {isPending
                ? "Saving..."
                : editItem
                  ? "Update State"
                  : "Create State"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* CSV Preview Dialog */}
      {csvPreview && (
        <Dialog
          open={!!csvPreview}
          onOpenChange={(open) => {
            if (!open && !csvImporting) setCsvPreview(null);
          }}
        >
          <DialogContent
            className="max-w-4xl flex flex-col overflow-y-hidden"
            style={{ maxHeight: "85vh" }}
          >
            <DialogHeader>
              <DialogTitle>
                Preview Import — {csvPreview.length} states
              </DialogTitle>
              <DialogDescription>
                Review the data below before importing.
                {csvPreview.length > 50 &&
                  ` Showing first 50 of ${csvPreview.length} rows.`}
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-auto flex-1 border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-muted-foreground">
                      #
                    </TableHead>
                    {Object.keys(csvPreview[0] || {}).map((col) => (
                      <TableHead
                        key={col}
                        className="whitespace-nowrap font-medium"
                      >
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvPreview.slice(0, 50).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground text-xs tabular-nums">
                        {i + 1}
                      </TableCell>
                      {Object.entries(row).map(([col, val], j) => (
                        <TableCell
                          key={j}
                          className="whitespace-nowrap text-sm"
                        >
                          {col === "is_active" ? (
                            <Badge
                              className={
                                val === "1"
                                  ? "bg-green-100 text-green-700 border border-green-300 hover:bg-green-100"
                                  : "bg-muted text-muted-foreground border"
                              }
                            >
                              {val === "1" ? "Active" : "Inactive"}
                            </Badge>
                          ) : col === "is_default" ? (
                            val === "1" ? (
                              <Badge className="bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-100">
                                Default
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                —
                              </span>
                            )
                          ) : col === "sort_order" ? (
                            <span className="tabular-nums font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                              {val || "0"}
                            </span>
                          ) : (
                            val || (
                              <span className="text-muted-foreground">–</span>
                            )
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {csvPreview.length > 50 && (
                    <TableRow>
                      <TableCell
                        colSpan={Object.keys(csvPreview[0]).length + 1}
                        className="text-center text-muted-foreground text-sm py-3"
                      >
                        … and {csvPreview.length - 50} more rows
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                {csvPreview.length} rows ready to import
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCsvPreview(null)}
                  isLoading={csvImporting}
                >
                  Cancel
                </Button>
                <Button onClick={executeImport} isLoading={csvImporting}>
                  {csvImporting
                    ? "Importing..."
                    : `Import ${csvPreview.length} rows`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      <DeleteDialog
        open={!!deleteId}
        onOpenChange={(open: boolean) => { if (!open) setDeleteId(null); }}
        title="Are you sure?"
        description="Delete this state? This action cannot be undone."
        isDeleting={deleteState.isPending}
        onConfirm={() => {
          if (deleteId) {
            deleteState.mutate(deleteId, {
              onSuccess: () => setDeleteId(null),
              onError: () => setDeleteId(null)
            });
          }
        }}
      />
    </>
  );
}
