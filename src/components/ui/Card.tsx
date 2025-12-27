interface CardProps {
    children: React.ReactNode;
    onClick: () => void;
}

export default function Card(props: CardProps) {
    return (
        <div className="card" onClick={props.onClick}>
            {props.children}
        </div>
    );
}