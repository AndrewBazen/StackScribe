import React from 'react';

export function NavIconButton( props: { icon: React.ReactNode, onClick: () => void }) {
    const { icon, onClick } = props;
    return (
        <button className="nav-icon-button" onClick={onClick}>
            <div className="nav-icon-container">
                {icon}
            </div>
        </button>
    );
}

