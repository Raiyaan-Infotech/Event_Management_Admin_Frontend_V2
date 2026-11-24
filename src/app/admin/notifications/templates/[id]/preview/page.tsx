'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

/** Old preview links open the View Details page. */
export default function NotificationTemplatePreviewPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const [done, setDone] = useState(false);
    if (!done) {
        setDone(true);
        router.replace(params?.id ? `/admin/notifications/templates/${params.id}` : '/admin/notifications/templates');
    }
    return (
        <div className="flex h-64 items-center justify-center">
            <p className="text-sm text-muted-foreground animate-pulse">Opening template...</p>
        </div>
    );
}
