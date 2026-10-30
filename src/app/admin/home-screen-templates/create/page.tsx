'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageLoader } from '@/components/common/page-loader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useHomeScreenTemplate } from '@/hooks/use-home-screen-templates';
import { HomeScreenTemplateForm } from '../_components/home-screen-template-form';

/** Add (no id) or Edit (`?id=`). The form is seeded from the loaded row via `key`. */
function Content() {
    const router = useRouter();
    const editId = useSearchParams().get('id');
    const { data, isLoading } = useHomeScreenTemplate(editId ?? undefined);

    if (!editId) return <HomeScreenTemplateForm />;
    if (isLoading) return <PageLoader open />;
    if (!data) {
        return (
            <Card className="p-8 text-center">
                <p className="text-sm text-muted-foreground">This template no longer exists.</p>
                <Button variant="outline" className="mt-4" onClick={() => router.push('/admin/home-screen-templates')}>
                    Back to Home Screen Templates
                </Button>
            </Card>
        );
    }
    return <HomeScreenTemplateForm key={`${data.id}-${data.updated_at ?? ''}`} initial={data} />;
}

// useSearchParams needs a Suspense boundary or the route fails to prerender.
export default function HomeScreenTemplateCreatePage() {
    return (
        <Suspense fallback={null}>
            <Content />
        </Suspense>
    );
}
