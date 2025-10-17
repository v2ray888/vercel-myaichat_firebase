
"use client"

// This is a special, dedicated page that will be loaded inside an iframe
// on the customer's website. It only contains the chat widget itself.

import ChatWidget from "@/components/chat-widget";
import { Suspense } from "react";

function WidgetPage() {
    return (
        // The Suspense Boundary is important for client components that use searchParams
        <Suspense fallback={<div>Loading...</div>}>
            <ChatWidget isEmbedded={true} />
        </Suspense>
    );
}

export default WidgetPage;
