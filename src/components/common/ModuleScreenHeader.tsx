import { ReactNode } from "react";

import StitchHeader from "./StitchHeader";

type ModuleScreenHeaderProps = {
  title: string;
  subtitle: string;
  onBack?: () => void;
  actions?: ReactNode;
};

export default function ModuleScreenHeader({
  title,
  subtitle,
  onBack,
  actions,
}: ModuleScreenHeaderProps) {
  return (
    <StitchHeader
      title={title}
      variant="gradient"
      subtitle={subtitle}
      onBackPress={onBack}
      actions={actions}
    />
  );
}
