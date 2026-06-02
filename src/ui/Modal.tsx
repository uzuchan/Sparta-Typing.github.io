import type { ReactNode } from "react";
import { X } from "../ui/icons";

export function Modal(props: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal-backdrop" onClick={props.onClose}>
      <div className="card modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{props.title}</h2>
          <button className="icon-btn ghost" onClick={props.onClose} aria-label="閉じる">
            <X size={18} />
          </button>
        </div>
        {props.children}
      </div>
    </div>
  );
}
