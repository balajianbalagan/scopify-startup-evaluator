export function Button({
  children,
  variant = "solid",
  size = "md",
  className = "",
  ...props
}: any) {
  const base =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:pointer-events-none";
  const variants: Record<string, string> = {
    solid: "bg-indigo-600 text-white hover:bg-indigo-700",
    outline: "border border-gray-300 text-gray-700 hover:bg-gray-50",
  };
  const sizes: Record<string, string> = {
    sm: "px-2.5 py-1.5 text-xs",
    md: "px-3 py-2 text-sm",
  };
  return (
    <button
      className={`${base} ${variants[variant] || ""} ${sizes[size] || ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}