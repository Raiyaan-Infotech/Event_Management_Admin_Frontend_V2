"use client";

import { useParams } from "next/navigation";
import { ConfigForm } from "../../_components/config-form";

export default function EditAvailabilityConfigPage() {
    const { id } = useParams<{ id: string }>();
    return <ConfigForm id={Number(id)} />;
}
