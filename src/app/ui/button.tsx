interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
}

export function Button({ children, ...rest }: ButtonProps) {
    return (
        <button {...rest}>{children}</button>
    );
}