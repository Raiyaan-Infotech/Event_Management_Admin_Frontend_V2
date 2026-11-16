"use client";

import { useState } from "react";
import { Upload, X, Crop, RotateCcw, ZoomIn, ZoomOut, Images } from "lucide-react";
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
import { MediaPickerModal } from "@/components/common/media-picker-modal";
import { toast } from "@/lib/toast";

interface ImageCropperProps {
  title: string;
  description: string;
  targetWidth: number;
  targetHeight: number;
  currentImage?: string;
  onImageCropped: (file: File) => void;
  onRemove: () => void;
  /** Custom accept attribute for the file input (default: "image/*") */
  accept?: string;
  /** If true, skip the crop dialog and pass the file directly */
  skipCrop?: boolean;
  /** If true, show the preview as a circle */
  rounded?: boolean;
  /** If false, hides the Upload from device button (default: true) */
  showUpload?: boolean;
  /** If false, hides the "Choose Image" media picker button (default: true) */
  showMediaPicker?: boolean;
}

const MAX_FILE_SIZE_MB = 10;

export function ImageCropper({
  title,
  description,
  targetWidth,
  targetHeight,
  currentImage,
  onImageCropped,
  onRemove,
  accept = "image/*",
  skipCrop = false,
  rounded = false,
  showUpload = true,
  showMediaPicker = true,
}: ImageCropperProps) {
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imgSrc, setImgSrc] = useState("");
  const [crop, setCrop] = useState<PercentCrop>();
  const [scale, setScale] = useState(1);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [localPreview, setLocalPreview] = useState<string>("");
  const [isCropping, setIsCropping] = useState(false);

  const aspect = targetWidth / targetHeight;

  const handleRemoveClick = () => {
    setLocalPreview("");
    onRemove();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Clear so picking the same file again still fires onChange.
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`File size exceeds the ${MAX_FILE_SIZE_MB}MB limit. Please choose a smaller file.`);
      return;
    }

    if (skipCrop) {
      onImageCropped(file);
      return;
    }

    setSelectedFile(file);
    setCrop(undefined);
    setScale(1);

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImgSrc(reader.result?.toString() || "");
      setShowCropDialog(true);
    });
    reader.readAsDataURL(file);
  };

  /** Start with a box matching the target size (or as large as the image allows). */
  const initialCrop = (naturalWidth: number, naturalHeight: number) =>
    centerAspectCrop(naturalWidth, naturalHeight, aspect, Math.min(100, (targetWidth / naturalWidth) * 100));

  const onImageLoad = (img: HTMLImageElement) => {
    setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    setCrop(initialCrop(img.naturalWidth, img.naturalHeight));
  };

  const resetCrop = () => {
    if (imageDimensions.width) setCrop(initialCrop(imageDimensions.width, imageDimensions.height));
    setScale(1);
  };

  const handleClose = () => {
    setShowCropDialog(false);
    setSelectedFile(null);
    setImgSrc("");
    setCrop(undefined);
    setScale(1);
  };

  const handleCrop = async () => {
    if (!crop || !imgSrc) return;
    setIsCropping(true);
    try {
      const croppedFile = await getCroppedFile(imgSrc, crop, {
        fileName: selectedFile?.name || "image.jpg",
        mimeType: selectedFile?.type || "image/jpeg",
        quality: 0.95,
        output: { width: targetWidth, height: targetHeight },
      });
      if (croppedFile) {
        setLocalPreview(URL.createObjectURL(croppedFile));
        onImageCropped(croppedFile);
        handleClose();
      }
    } catch {
      toast.error("Could not crop this image. Please try another one.");
    } finally {
      setIsCropping(false);
    }
  };

  const handleMediaSelect = async (url: string) => {
    setMediaPickerOpen(false);
    setSelectedFile(null);
    setCrop(undefined);
    setScale(1);

    // Use /api/proxy-image which server-side fetches the image and returns it
    // same-origin — guarantees canvas.toBlob() never throws SecurityError.
    try {
      const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      setImgSrc(dataUrl);
      setShowCropDialog(true);
    } catch {
      toast.error("Failed to load image for cropping. Please try again.");
    }
  };

  const displayImage = localPreview || currentImage;

  const cropAreaPx = crop
    ? {
      width: Math.round((crop.width / 100) * imageDimensions.width),
      height: Math.round((crop.height / 100) * imageDimensions.height),
    }
    : { width: 0, height: 0 };

  return (
    <>
      <div className="flex items-center gap-6 p-4 border rounded-xl bg-muted/30">
        <div className="relative group">
          <div className={`h-24 w-24 overflow-hidden border-4 border-background shadow-xl ${rounded ? 'rounded-full' : 'rounded-2xl'} bg-muted flex items-center justify-center`}>
            {displayImage ? (
              <img
                src={displayImage}
                alt={title}
                className="h-full w-full object-cover transition-transform group-hover:scale-110"
              />
            ) : (
              <div className="text-muted-foreground">
                <Images className="h-8 w-8 opacity-20" />
              </div>
            )}
          </div>

          {displayImage && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleRemoveClick}
              title="Remove Image"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex-1 space-y-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground leading-relaxed italic">{description}</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {showMediaPicker && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 px-4 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => setMediaPickerOpen(true)}
              >
                <Images className="mr-2 h-4 w-4" />
                {currentImage ? "Change Image" : "Choose Image"}
              </Button>
            )}

            {showUpload && (
              <Button variant="ghost" size="sm" asChild className="h-9 px-3 text-muted-foreground cursor-pointer">
                <label>
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Upload
                  <input
                    type="file"
                    accept={accept}
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>
              </Button>
            )}

            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 px-2 py-1 border rounded bg-muted/50">
              {targetWidth}x{targetHeight} Px
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 px-2 py-1 border rounded bg-muted/50">
              Max 10MB
            </div>
          </div>
        </div>
      </div>

      {/* Crop Dialog */}
      <Dialog open={showCropDialog} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto gap-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Crop className="h-4 w-4" />
              </span>
              Crop Image
            </DialogTitle>
            <DialogDescription>
              Drag the box to move it and the corners to resize. The image is saved at exactly {targetWidth}×{targetHeight}px.
            </DialogDescription>
          </DialogHeader>

          {imgSrc && (
            <CropArea
              src={imgSrc}
              crop={crop}
              onChange={setCrop}
              aspect={aspect}
              zoom={scale}
              onImageLoad={onImageLoad}
            />
          )}

          <div className="grid gap-4 rounded-xl border border-border bg-muted/30 p-4 md:grid-cols-[1fr_auto] md:items-center">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => setScale((z) => Math.max(1, +(z - 0.25).toFixed(2)))}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <Slider value={[scale]} onValueChange={(v) => setScale(v[0])} min={1} max={3} step={0.05} className="flex-1" />
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => setScale((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <span className="w-12 text-right text-sm font-semibold tabular-nums">{scale.toFixed(1)}×</span>
              <Button type="button" variant="outline" size="sm" onClick={resetCrop} className="ml-1">
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Reset
              </Button>
            </div>

            <div className="flex items-center gap-4 text-xs md:border-l md:border-border md:pl-4">
              <div>
                <div className="text-muted-foreground">Original</div>
                <div className="font-semibold tabular-nums">
                  {imageDimensions.width ? `${imageDimensions.width} × ${imageDimensions.height}` : "—"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Selected</div>
                <div className="font-semibold tabular-nums">
                  {cropAreaPx.width ? `${cropAreaPx.width} × ${cropAreaPx.height}` : "—"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Output</div>
                <div className="font-semibold tabular-nums text-primary">{targetWidth} × {targetHeight}</div>
              </div>
            </div>
          </div>

          {cropAreaPx.width > 0 && cropAreaPx.width < targetWidth && (
            <p className="-mt-2 text-xs text-amber-600 dark:text-amber-400">
              The selected area is smaller than {targetWidth}px wide, so the image will be scaled up and may look soft.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isCropping}>Cancel</Button>
            <Button type="button" onClick={handleCrop} disabled={!crop} isLoading={isCropping}>
              {!isCropping && <Crop className="mr-2 h-4 w-4" />}
              Crop & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MediaPickerModal
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={handleMediaSelect}
      />
    </>
  );
}
