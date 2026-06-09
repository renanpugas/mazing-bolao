import { createFileRoute } from "@tanstack/react-router";

import { ParticipantPage } from "@/components/participant-page";

export const Route = createFileRoute("/")({ component: ParticipantPage });
