"use client";

import type { KeyboardEvent, ReactNode } from "react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "./ui";

export interface SelectOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** ข้อความเมื่อยังไม่มีค่าที่เลือก (ถ้าไม่ส่ง จะใช้ label ของ option ที่ value เป็น "") */
  placeholder?: string;
  /** md = ช่องกรอกปกติ, sm = ตัวควบคุมกะทัดรัด (จำนวนต่อหน้า) */
  size?: "md" | "sm";
  /** เปิดช่องค้นหาด้านบนเมนู — ใช้กับรายการยาว مثل รายชื่อลูกค้า */
  searchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  onBlur?: () => void;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

type Placement = "top" | "bottom";

interface MenuPosition {
  left: number;
  width: number;
  maxHeight: number;
  placement: Placement;
  top?: number;
  bottom?: number;
}

// ระยะห่างจากขอบจอ และความสูงสูงสุดของเมนู ก่อนจะเลื่อนภายใน
const MENU_GAP = 6;
const MENU_MAX_HEIGHT = 320;
const VIEWPORT_MARGIN = 8;
const MIN_MENU_WIDTH = 112;
const MIN_MENU_HEIGHT = 96;
const TYPEAHEAD_TIMEOUT = 600;

/**
 * ขอบเขตที่มองเห็นจริงในหน่วยพิกัดเดียวกับ position: fixed
 * (visualViewport คือส่วนที่เห็นหลังคีย์บอร์ดมือถือหรือแถบเครื่องมือเปิดขึ้น)
 */
function visibleBounds() {
  const vv = window.visualViewport;
  return {
    top: vv ? vv.offsetTop : 0,
    left: vv ? vv.offsetLeft : 0,
    width: vv ? vv.width : window.innerWidth,
    height: vv ? vv.height : window.innerHeight,
  };
}

const triggerSizes = {
  md: "h-11 gap-2 px-3 text-base sm:text-sm",
  sm: "h-11 gap-1.5 px-2 text-base lg:h-9 lg:text-xs",
};

/** หา index ของตัวเลือกที่กดได้ตัวถัดไป โดยวนรอบรายการ */
function findEnabled(
  items: { disabled?: boolean }[],
  from: number,
  step: 1 | -1
): number {
  let index = from;
  for (let i = 0; i < items.length; i++) {
    index = (index + step + items.length) % items.length;
    if (!items[index].disabled) return index;
  }
  return -1;
}

function optionText(option: SelectOption): string {
  if (typeof option.label === "string") return option.label;
  if (typeof option.label === "number") return String(option.label);
  return "";
}

/**
 * Select แบบกำหนดเอง — ไม่ใช้ <select> ของเบราว์เซอร์
 * - เมนูวาดผ่าน portal + position fixed จึงไม่ถูก clip ใน modal/ตารางที่ overflow
 * - คีย์บอร์ด: ↑ ↓ Home End Enter Space Esc + พิมพ์ตัวอักษรเพื่อค้นหา
 * - searchable: มีช่องค้นหาด้านบนเมนู กรองตาม label (เหมาะกับรายการยาว)
 * - ARIA combobox/listbox พร้อม aria-activedescendant
 */
export function Select({
  value,
  onChange,
  options,
  placeholder,
  size = "md",
  searchable = false,
  searchPlaceholder = "ค้นหา…",
  disabled = false,
  invalid = false,
  onBlur,
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<MenuPosition | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const typeaheadRef = useRef({ text: "", at: 0 });
  const listboxId = useId();
  const optionId = (index: number) => `${listboxId}-option-${index}`;

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const isPlaceholder = !selected || selected.value === "";

  // รายการที่แสดงหลังกรองด้วยคำค้น (index ที่ใช้คือ index ในรายการนี้)
  const visibleOptions = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return options
      .map((option, index) => ({ option, index }))
      .filter(({ option }) => {
        if (!keyword) return true;
        return optionText(option).toLowerCase().includes(keyword);
      });
  }, [options, query]);

  const visibleItems = useMemo(
    () => visibleOptions.map((entry) => entry.option),
    [visibleOptions]
  );
  const visibleSelectedIndex = visibleOptions.findIndex(
    (entry) => entry.option.value === value
  );

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const view = visibleBounds();
    // ใช้ขอบล่าง/บนของ visualViewport เพื่อไม่ให้เมนูมุดใต้คีย์บอร์ด
    const spaceBelow =
      view.top + view.height - rect.bottom - MENU_GAP - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - view.top - MENU_GAP - VIEWPORT_MARGIN;

    // เปิดลงเมื่อที่ด้านล่างพอกับรายการขั้นต่ำ ไม่งั้นพลิกขึ้นด้านบนถ้ามีที่มากกว่า
    const placement: Placement =
      spaceBelow >= Math.min(MENU_MAX_HEIGHT, 220) || spaceBelow >= spaceAbove
        ? "bottom"
        : "top";

    const width = Math.min(
      Math.max(rect.width, MIN_MENU_WIDTH),
      view.width - VIEWPORT_MARGIN * 2
    );
    const minLeft = view.left + VIEWPORT_MARGIN;
    const maxLeft = view.left + view.width - width - VIEWPORT_MARGIN;
    const left = Math.min(Math.max(rect.left, minLeft), Math.max(minLeft, maxLeft));
    const available = placement === "bottom" ? spaceBelow : spaceAbove;
    const maxHeight = Math.min(
      MENU_MAX_HEIGHT,
      Math.max(MIN_MENU_HEIGHT, available)
    );

    setPosition({
      left,
      width,
      maxHeight,
      placement,
      top: placement === "bottom" ? rect.bottom + MENU_GAP : undefined,
      bottom:
        placement === "top"
          ? window.innerHeight - rect.top + MENU_GAP
          : undefined,
    });
  }, []);

  function openMenu(preferredIndex?: number) {
    if (disabled) return;
    const fallback =
      preferredIndex ??
      (selectedIndex >= 0 ? selectedIndex : findEnabled(options, -1, 1));
    setQuery("");
    setActiveIndex(fallback);
    setOpen(true);
    updatePosition();
  }

  function closeMenu({ refocus = false } = {}) {
    setOpen(false);
    setQuery("");
    if (refocus) triggerRef.current?.focus({ preventScroll: true });
  }

  function commit(index: number) {
    const entry = visibleOptions[index];
    if (!entry || entry.option.disabled) return;
    onChange(entry.option.value);
    closeMenu({ refocus: true });
  }

  function handleTypeahead(key: string) {
    const now = Date.now();
    const previous = typeaheadRef.current;
    const text =
      now - previous.at > TYPEAHEAD_TIMEOUT ? key : previous.text + key;
    typeaheadRef.current = { text, at: now };

    const start = open ? activeIndex : selectedIndex;

    for (let step = 1; step <= options.length; step++) {
      const index = (start + step + options.length) % options.length;
      const label = options[index].label;
      if (options[index].disabled || typeof label !== "string") continue;
      if (label.toLowerCase().startsWith(text.toLowerCase())) {
        if (!open) openMenu(index);
        else setActiveIndex(index);
        return;
      }
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) {
          openMenu(selectedIndex >= 0 ? selectedIndex : findEnabled(options, -1, 1));
        } else if (!searchable) {
          setActiveIndex((index) => findEnabled(visibleItems, index, 1));
        }
        return;
      case "ArrowUp":
        event.preventDefault();
        if (!open) {
          openMenu(selectedIndex >= 0 ? selectedIndex : findEnabled(options, -1, -1));
        } else if (!searchable) {
          setActiveIndex((index) => findEnabled(visibleItems, index, -1));
        }
        return;
      case "Home":
        if (!open || searchable) return;
        event.preventDefault();
        setActiveIndex(findEnabled(visibleItems, -1, 1));
        return;
      case "End":
        if (!open || searchable) return;
        event.preventDefault();
        setActiveIndex(findEnabled(visibleItems, visibleItems.length, -1));
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        if (open) commit(activeIndex);
        else openMenu();
        return;
      case "Escape":
        if (!open) return;
        event.preventDefault();
        event.stopPropagation();
        closeMenu({ refocus: true });
        return;
      case "Tab":
        if (open) closeMenu();
        return;
      default:
        if (
          !searchable &&
          event.key.length === 1 &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey
        ) {
          handleTypeahead(event.key);
        }
    }
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) => findEnabled(visibleItems, index, 1));
        return;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => findEnabled(visibleItems, index, -1));
        return;
      case "Enter":
        event.preventDefault();
        if (activeIndex >= 0) commit(activeIndex);
        else if (visibleItems.length === 1) commit(0);
        return;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        closeMenu({ refocus: true });
        return;
      case "Tab":
        closeMenu();
        return;
    }
  }

  // ปิดเมื่อคลิกนอก / เลื่อนหน้าจอและคีย์บอร์ดมือถือให้เมนูตามปุ่มเสมอ
  useEffect(() => {
    if (!open) return;

    updatePosition();
    const reposition = () => updatePosition();
    const visualViewport = window.visualViewport;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
      setQuery("");
    }

    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    // คีย์บอร์ดมือถือเปิด/ปิดจะย่อ visualViewport โดยไม่เกิด resize ของ window (iOS)
    visualViewport?.addEventListener("resize", reposition);
    visualViewport?.addEventListener("scroll", reposition);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      visualViewport?.removeEventListener("resize", reposition);
      visualViewport?.removeEventListener("scroll", reposition);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open, updatePosition]);

  // searchable: โฟกัสช่องค้นหาทันทีที่เมนูเปิด เพื่อพิมพ์ได้เลย
  useEffect(() => {
    if (!open || !searchable) return;
    const timer = window.setTimeout(() => {
      searchRef.current?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, searchable]);

  // เลื่อนรายการที่กำลังเลือกให้อยู่ในสายตาเมื่อเดินด้วยคีย์บอร์ด
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    menuRef.current
      ?.querySelector<HTMLElement>(`[data-option-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={
          open && activeIndex >= 0 ? optionId(activeIndex) : undefined
        }
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleKeyDown}
        onBlur={() => onBlur?.()}
        className={cn(
          "relative flex w-full items-center justify-between rounded-xl border bg-surface-card text-left font-medium text-ink transition-colors",
          "border-line hover:border-zinc-300",
          "disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-500",
          open && "border-primary",
          invalid && "border-coral-dark/60",
          triggerSizes[size],
          className
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            isPlaceholder && "text-zinc-500"
          )}
        >
          {selected ? selected.label : (placeholder ?? "")}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "shrink-0 text-primary-dark/70 transition-transform duration-200",
            size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4",
            open && "rotate-180"
          )}
        />
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              left: position.left,
              width: position.width,
              top: position.top,
              bottom: position.bottom,
              maxHeight: position.maxHeight,
            }}
            className={cn(
              "fixed z-[70] flex flex-col overflow-hidden rounded-xl border border-line bg-surface-card",
              "shadow-raise",
              position.placement === "top"
                ? "origin-bottom animate-select-in-up"
                : "origin-top animate-select-in"
            )}
          >
            {searchable && (
              <div className="shrink-0 border-b border-line p-1.5">
                <div className="relative">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
                  />
                  <input
                    ref={searchRef}
                    type="search"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setActiveIndex(0);
                    }}
                    onKeyDown={handleSearchKeyDown}
                    placeholder={searchPlaceholder}
                    aria-label={searchPlaceholder}
                    aria-controls={listboxId}
                    aria-activedescendant={
                      activeIndex >= 0 ? optionId(activeIndex) : undefined
                    }
                    className="h-11 w-full rounded-lg border border-line bg-surface-card pl-8 pr-3 text-base text-ink placeholder:text-zinc-500 focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15 sm:text-sm"
                  />
                </div>
              </div>
            )}

            <div
              id={listboxId}
              role="listbox"
              aria-label={ariaLabel}
              aria-labelledby={ariaLabelledBy}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5"
            >
              {visibleOptions.length === 0 && (
                <p className="px-3 py-2.5 text-sm text-zinc-500">
                  {query.trim()
                    ? `ไม่พบ “${query.trim()}”`
                    : "ไม่มีตัวเลือก"}
                </p>
              )}
              {visibleOptions.map(({ option }, index) => {
                const isSelected = option.value === value;
                const isActive = index === activeIndex;
                return (
                  <div
                    key={`${option.value || "empty"}-${index}`}
                    id={optionId(index)}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled || undefined}
                    data-option-index={index}
                    onPointerMove={(event) => {
                      if (event.pointerType === "mouse" && !option.disabled) {
                        setActiveIndex(index);
                      }
                    }}
                    // กันไม่ให้โฟกัสหลุดจากช่องค้นหา/ปุ่มก่อน click จะทำงาน
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => commit(index)}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isSelected
                        ? "bg-primary-bg font-semibold text-primary-dark"
                        : "text-zinc-700",
                      isActive && !isSelected && "bg-zinc-100 text-ink",
                      isActive && isSelected && "bg-primary-bg",
                      option.disabled && "cursor-not-allowed opacity-45"
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {option.label}
                    </span>
                    {isSelected && (
                      <Check
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 text-primary"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
