import * as React from "react";
import { cn } from "@/lib/cn";

export interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    className?: string;
    text: string;
}

export function AnimatedButton({ className, text, ...props }: AnimatedButtonProps) {
    return (
        <button className={cn("btn-animated", className)} {...props}>
            <span className="circle" aria-hidden="true">
                <span className="icon arrow"></span>
            </span>
            <span className="button-text">{text}</span>
        </button>
    );
}
