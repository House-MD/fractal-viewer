"use client";

import dynamic from "next/dynamic";

const Canvas = dynamic(() => import("@/app/components/Canvas"), {
    ssr: false,
    loading: () => <p>loading the Godhead...</p>,
});

export default function CanvasWrapper() {
    return <Canvas />
}