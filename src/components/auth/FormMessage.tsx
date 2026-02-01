import { CheckCircle2, AlertCircle } from "lucide-react";

interface FormMessageProps {
  type: "success" | "error";
  message: string;
}

/**
 * FormMessage - Display success or error messages
 * UI ONLY - Used for showing fake submission feedback
 */
const FormMessage = ({ type, message }: FormMessageProps) => {
  const isSuccess = type === "success";

  return (
    <div
      className={`flex items-center gap-2 p-3 rounded-lg text-sm animate-fade-in ${
        isSuccess
          ? "bg-success/10 text-success"
          : "bg-destructive/10 text-destructive"
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
      )}
      <span>{message}</span>
    </div>
  );
};

export default FormMessage;
