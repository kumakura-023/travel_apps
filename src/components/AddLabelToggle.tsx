import { useState } from "react";

interface Props {
  onToggle: (active: boolean) => void;
}

export default function AddLabelToggle({ onToggle }: Props) {
  const [active, setActive] = useState(false);
  return (
    <button
      className={`fixed top-20 right-4 md:right-4 lg:right-4 2xl:right-4 xl:right-4 z-50 px-4 py-2 rounded shadow ${active ? "bg-green-600 text-white" : "bg-white"}`}
      onClick={() => {
        const next = !active;
        setActive(next);
        onToggle(next);
      }}
    >
      {active ? "メモ配置中" : "メモ追加"}
    </button>
  );
}
