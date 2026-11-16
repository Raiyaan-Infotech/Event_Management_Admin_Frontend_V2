"use client";

import { useState, useCallback, useEffect } from "react";
import { Crop, RotateCcw, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { CropArea, centerAspectCrop, getCroppedFile, type PercentCrop } from "@/components/ui/crop-area";
import { cn } from "@/lib/utils";

interface MediaCropDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Image URL of the existing file to crop */
  imageUrl: string;
  /** Original file name (used to name the resulting File object) */
  fileName: string;
  /** MIME type of the image (e.g. "image/jpeg") */
  mimeType: string;
  /** Called when the user cancels or closes the dialog */
  onClose: () => void;
  /**
   * Called when the user clicks "Crop & Save" with the resulting cropped File
   * and a data URL of the cropped image for immediate local preview.
   */
  onCropped: (file: File, dataUrl: string) => void;
  /** Whether the save/upload is in progress (shows loading state on save button) */
  isSaving?: boolean;
}

const ASPECTS: { label: string; value: number | undefined }[] = [
  { label: "Free", value: undefined },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:2", value: 3 / 2 },
  { label: "16:9", value: 16 / 9 },
];

const DEFAULT_CROP: PercentCrop = { x: 10, y: 10, width: 80, height: 80 };

export function MediaCropDialog({
  open,
  imageUrl,
  fileName,
  mimeType,
  onClose,
  onCropped,
  isSaving = false,
}: MediaCropDialogProps) {
  const [crop, setCrop] = useState<PercentCrop>(DEFAULT_CROP);
  const [aspectIndex, setAspectIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [working, setWorking] = useState(false);

  const aspect = ASPECTS[aspectIndex].value;

  // Reset state whenever the dialog opens with a new image
  useEffect(() => {
    if (open) {
      setCrop(DEFAULT_CROP);
      setAspectIndex(0);
      setZoom(1);
      setNatural({ width: 0, height: 0 });
    }
  }, [open, imageUrl]);

  const applyAspect = (index: number) => {
    setAspectIndex(index);
    if (natural.width) setCrop(centerAspectCrop(natural.width, natural.height, ASPECTS[index].value, 80));
  };

  const resetCrop = () => {
    setZoom(1);
    setCrop(natural.width ? centerAspectCrop(natural.width, natural.height, aspect, 80) : DEFAULT_CROP);
  };

  const selectAll = () => setCrop({ x: 0, y: 0, width: 100, height: 100 });

  const cropPx = {
    width: Math.round((crop.width / 100) * natural.width),
    height: Math.round((crop.height / 100) * natural.height),
  };

  const handleCropAndSave = useCallback(async () => {
    if (!crop.width || !crop.height) return;
    setWorking(true);
    try {
      const file = await getCroppedFile(imageUrl, crop, {
        fileName,
        mimeType,
        quality: 0.98,
        crossOrigin: "anonymous",
      });
      if (!file) return;
      // Data URL for instant local preview (no CDN wait)
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      onCropped(file, dataUrl);
    } finally {
      setWorking(false);
    }
  }, [crop, imageUrl, fileName, mimeType, onCropped]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto gap-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Crop className="h-4 w-4" />
            </span>
            Crop Image
          </DialogTitle>
          <DialogDescription>
            Drag the box to move it, drag the handles to resize. The cropped image replaces the original file.
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar: aspect presets + quick actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
            {ASPECTS.map((a, i) => (
              <button
                key={a.label}
                type="button"
                onClick={() => applyAspect(i)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                  i === aspectIndex
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {!aspect && (
              <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                <Maximize2 className="mr-1.5 h-3.5 w-3.5" />
                Select all
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={resetCrop}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        </div>

        {imageUrl && (
          <CropArea
            src={imageUrl}
            crop={crop}
            onChange={setCrop}
            aspect={aspect}
            zoom={zoom}
            crossOrigin="anonymous"
            onImageLoad={(img) => setNatural({ width: img.naturalWidth, height: img.naturalHeight })}
          />
        )}

        {/* Zoom + dimensions */}
        <div className="grid gap-4 rounded-xl border border-border bg-muted/30 p-4 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <Slider value={[zoom]} onValueChange={(v) => setZoom(v[0])} min={1} max={3} step={0.05} className="flex-1" />
            <button
              type="button"
              aria-label="Zoom in"
              onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <span className="w-12 text-right text-sm font-semibold tabular-nums">{zoom.toFixed(1)}×</span>
          </div>

          <div className="flex items-center gap-4 text-xs md:border-l md:border-border md:pl-4">
            <div>
              <div className="text-muted-foreground">Original</div>
              <div className="font-semibold tabular-nums">
                {natural.width ? `${natural.width} × ${natural.height}` : "—"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Output</div>
              <div className="font-semibold tabular-nums text-primary">
                {cropPx.width ? `${cropPx.width} × ${cropPx.height}` : "—"}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving || working}>
            Cancel
          </Button>
          <Button onClick={handleCropAndSave} isLoading={isSaving || working} disabled={!natural.width}>
            {!(isSaving || working) && <Crop className="mr-2 h-4 w-4" />}
            Crop & Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
