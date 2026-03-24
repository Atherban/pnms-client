import StitchStatusBadge from "../common/StitchStatusBadge";

type Props = {
  label: string;
  tone?: "active" | "inactive" | "warning" | "neutral";
};

export default function SuperAdminStatusBadge({ label, tone = "neutral" }: Props) {
  return <StitchStatusBadge label={label} tone={tone === "active" ? "success" : tone} />;
}
