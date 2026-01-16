import React from 'react';

interface NavIconButtonProps {
    icon: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'primary';
    className?: string;
}

export function NavIconButton({ icon, onClick, variant = 'default', className = '' }: NavIconButtonProps) {
    const variantClass = variant === 'primary' ? 'icon-button--primary' : '';
    return (
        <button
            className={`icon-button ${variantClass} ${className}`.trim()}
            onClick={onClick}
        >
            {icon}
        </button>
    );
}

