import { Check, X } from "lucide-react";

interface PasswordRulesProps {
  password: string;
}

interface Rule {
  label: string;
  test: (password: string) => boolean;
}

const rules: Rule[] = [
  {
    label: "At least 8 characters",
    test: (password) => password.length >= 8,
  },
  {
    label: "One uppercase letter",
    test: (password) => /[A-Z]/.test(password),
  },
  {
    label: "One number",
    test: (password) => /[0-9]/.test(password),
  },
];

/**
 * PasswordRules - Visual display of password requirements
 * Shows real-time validation status for each rule
 * UI ONLY - Client-side validation only
 */
const PasswordRules = ({ password }: PasswordRulesProps) => {
  return (
    <div className="space-y-2 mt-2">
      <p className="text-xs text-muted-foreground font-medium">
        Password requirements:
      </p>
      <ul className="space-y-1">
        {rules.map((rule, index) => {
          const isValid = rule.test(password);
          return (
            <li
              key={index}
              className={`flex items-center gap-2 text-xs transition-colors ${
                isValid ? "text-success" : "text-muted-foreground"
              }`}
            >
              {isValid ? (
                <Check className="h-3 w-3" />
              ) : (
                <X className="h-3 w-3" />
              )}
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default PasswordRules;

/**
 * Helper function to validate password against all rules
 * Used for form submission validation
 */
export const isPasswordValid = (password: string): boolean => {
  return rules.every((rule) => rule.test(password));
};
