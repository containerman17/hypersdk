interface ButtonProps {
    onClick: () => void;
    children: React.ReactNode;
    variant?: 'primary' | 'secondary';
    disabled?: boolean;
}
export const Button: React.FC<ButtonProps> = ({ onClick, children, variant = 'primary', disabled = false }) => {
    const baseClasses = "rounded-md mr-4 px-3 py-2 text-sm font-semibold shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
    const variantClasses = variant === 'primary'
        ? "bg-blue-600 text-white hover:bg-blue-500 focus-visible:outline-blue-600"
        : "bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50";
    const disabledClasses = disabled
        ? "opacity-50 cursor-not-allowed"
        : "";

    return (
        <button
            onClick={disabled ? undefined : onClick}
            className={`${baseClasses} ${variantClasses} ${disabledClasses}`}
            disabled={disabled}
        >
            {children}
        </button>
    );
};