import React from 'react';

export function NavIconButton( props: { icon: React.ReactNode, onClick: () => void }) {
    const { icon, onClick } = props;
    return (
        <button id="nav-icon-button" className="button" onClick={onClick}>
            {icon}
        </button>
    );
}

