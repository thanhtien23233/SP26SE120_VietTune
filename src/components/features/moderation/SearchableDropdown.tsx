import { useEffect, useMemo, useRef, useState, useId } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";

function isClickOnScrollbar(event: MouseEvent): boolean {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0 && event.clientX >= document.documentElement.clientWidth) {
        return true;
    }
    return false;
}

export function SearchableDropdown({
    value,
    onChange,
    options,
    placeholder = "-- Chọn --",
    searchable = true,
    disabled = false,
    ariaLabel,
}: {
    value: string;
    onChange: (v: string) => void;
    options: string[];
    placeholder?: string;
    searchable?: boolean;
    disabled?: boolean;
    ariaLabel?: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
    const listboxId = useId();

    const filteredOptions = useMemo(() => {
        if (!search) return options;
        return options.filter((opt) => opt.toLowerCase().includes(search.toLowerCase()));
    }, [options, search]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isClickOnScrollbar(event)) return;
            const target = event.target as Node;
            const clickedOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
            const clickedOutsideMenu = menuRef.current && !menuRef.current.contains(target);
            if (clickedOutsideDropdown && (menuRef.current ? clickedOutsideMenu : true)) {
                setIsOpen(false);
                setSearch("");
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const updateRect = () => {
            if (buttonRef.current) setMenuRect(buttonRef.current.getBoundingClientRect());
        };
        if (isOpen) updateRect();
        window.addEventListener("resize", updateRect);
        window.addEventListener("scroll", updateRect, true);
        return () => {
            window.removeEventListener("resize", updateRect);
            window.removeEventListener("scroll", updateRect, true);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                setIsOpen(false);
                setSearch("");
                buttonRef.current?.focus();
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [isOpen]);

    return (
        <div ref={dropdownRef} className="relative">
            <button
                ref={buttonRef}
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                onKeyDown={(e) => {
                    if (disabled) return;
                    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                        e.preventDefault();
                        if (!isOpen) setIsOpen(true);
                    }
                }}
                disabled={disabled}
                className={`w-full px-5 py-3 pr-10 text-neutral-900 border border-neutral-400 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus:border-primary-500 transition-colors text-left flex items-center justify-between ${
                    disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                }`}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-controls={isOpen ? listboxId : undefined}
                aria-label={ariaLabel}
                style={{ backgroundColor: "#FFFCF5" }}
            >
                <span className={value ? "text-neutral-900" : "text-neutral-400"}>{value || placeholder}</span>
                <ChevronDown
                    className={`h-5 w-5 text-neutral-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            {isOpen &&
                menuRect &&
                createPortal(
                    <div
                        ref={(el) => (menuRef.current = el)}
                        id={listboxId}
                        role="listbox"
                        aria-label={ariaLabel ? `${ariaLabel}, chọn một mục` : "Danh sách lựa chọn"}
                        className="rounded-2xl border border-neutral-300/80 shadow-xl backdrop-blur-sm overflow-hidden transition-all duration-300"
                        style={{
                            backgroundColor: "#FFFCF5",
                            position: "absolute",
                            left: Math.max(8, menuRect.left + (window.scrollX ?? 0)),
                            top: menuRect.bottom + (window.scrollY ?? 0) + 8,
                            width: menuRect.width,
                            zIndex: 40,
                        }}
                    >
                        {searchable && (
                            <div className="p-3 border-b border-neutral-200">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" aria-hidden />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Tìm kiếm..."
                                        aria-label="Lọc danh sách tùy chọn"
                                        className="w-full pl-9 pr-3 py-2 text-neutral-900 placeholder:text-neutral-600 border border-neutral-400 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus:border-primary-500 text-sm"
                                        style={{ backgroundColor: "#FFFCF5" }}
                                        autoFocus
                                    />
                                </div>
                            </div>
                        )}
                        <div
                            className="max-h-60 overflow-y-auto"
                            style={{
                                scrollbarWidth: "thin",
                                scrollbarColor: "#9B2C2C rgba(255, 255, 255, 0.3)",
                            }}
                        >
                            {filteredOptions.length === 0 ? (
                                <div className="px-5 py-3 text-neutral-400 text-sm text-center" role="status">
                                    Không tìm thấy kết quả
                                </div>
                            ) : (
                                filteredOptions.map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        role="option"
                                        aria-selected={value === option}
                                        onClick={() => {
                                            onChange(option);
                                            setIsOpen(false);
                                            setSearch("");
                                            buttonRef.current?.focus();
                                        }}
                                        className={`w-full px-5 py-3 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 ${
                                            value === option
                                                ? "bg-primary-600 text-white font-medium"
                                                : "text-neutral-900 hover:bg-primary-100 hover:text-primary-700"
                                        }`}
                                    >
                                        {option}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>,
                    document.body,
                )}
        </div>
    );
}
