type ApprovalStatus = "draft" | "pending" | "approved" | "rejected";

interface ApprovalStatusBadgeProps {
    status: ApprovalStatus;
    labels: {
        statusDraft: string;
        statusPending: string;
        statusApproved: string;
        statusRejected: string;
    };
}

const STATUS_STYLES: Record<ApprovalStatus, string> = {
    draft: "bg-gray-100 text-gray-600",
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
};

export default function ApprovalStatusBadge({ status, labels }: ApprovalStatusBadgeProps) {
    const text = {
        draft: labels.statusDraft,
        pending: labels.statusPending,
        approved: labels.statusApproved,
        rejected: labels.statusRejected,
    }[status];

    return (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[status]}`}>
            {text}
        </span>
    );
}
