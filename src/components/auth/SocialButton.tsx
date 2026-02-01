import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface SocialButtonProps {
  icon: ReactNode;
  label: string;
  disabled?: boolean;
}

/**
 * SocialButton - Disabled social login button
 * UI ONLY - Buttons are disabled, no functionality
 */
const SocialButton = ({ icon, label, disabled = true }: SocialButtonProps) => {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full flex items-center justify-center gap-2 h-11"
      disabled={disabled}
      title={disabled ? "Coming soon - backend not connected" : undefined}
    >
      {icon}
      <span>{label}</span>
    </Button>
  );
};

export default SocialButton;
