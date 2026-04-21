import './MobileHeader.css';
import logo from '../assets/logo.png';
import { NotificationCenter } from './NotificationCenter';

interface MobileHeaderProps {
    onSearchClick?: () => void;
}

export default function MobileHeader({ onSearchClick }: MobileHeaderProps) {

    return (
        <header className="mobile-header">
            <div className="header-center">
                <img src={logo} alt="Phone & Tic" className="header-logo" />
            </div>

            <div className="header-actions">
                {onSearchClick && (
                    <button
                        className="header-btn"
                        onClick={onSearchClick}
                        aria-label="Rechercher"
                    >
                        🔍
                    </button>
                )}
                <NotificationCenter />
            </div>
        </header>
    );
}
