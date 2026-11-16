import { Loader2 } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";

interface DeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    title?: string;
    description?: string;
    isDeleting?: boolean;
    confirmText?: string;
}

// Same as the Client Portal's DeletePopup: small centred popup — title, one line, Cancel + red Delete.
export function DeleteDialog({
    open,
    onOpenChange,
    onConfirm,
    title,
    description,
    confirmText,
    isDeleting = false,
}: DeleteDialogProps) {
    const { t } = useTranslation();

    return (
        <AlertDialog open={open} onOpenChange={(val) => !isDeleting && onOpenChange(val)}>
            <AlertDialogContent className="max-w-[440px] gap-0 rounded-xl p-5">
                <AlertDialogTitle className="text-[16px] font-bold leading-tight text-foreground">
                    {title || t("common.are_you_sure", "Are you sure?")}
                </AlertDialogTitle>
                <AlertDialogDescription className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                    {description || t("common.delete_confirm", "This action cannot be undone.")}
                </AlertDialogDescription>
                <div className="mt-5 flex justify-end gap-2">
                    <AlertDialogCancel disabled={isDeleting}>{t("common.cancel", "Cancel")}</AlertDialogCancel>
                    {/* AlertDialogAction keeps the close-on-confirm behaviour all 54 usages rely on */}
                    <AlertDialogAction
                        className={buttonVariants({ variant: "destructive" })}
                        onClick={onConfirm}
                        disabled={isDeleting}
                    >
                        {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {isDeleting ? t("common.deleting", "Deleting...") : (confirmText || t("common.delete", "Delete"))}
                    </AlertDialogAction>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
}
