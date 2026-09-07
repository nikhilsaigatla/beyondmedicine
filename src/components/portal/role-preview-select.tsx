import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getRolePreview, ROLE_PREVIEW_OPTIONS, setRolePreview, type RolePreview } from "@/lib/portal/role-preview";

export function RolePreviewSelect({ compact = false }: { compact?: boolean }) {
  const [value, setValue] = useState<RolePreview>("admin");
  const qc = useQueryClient();

  useEffect(() => {
    setValue(getRolePreview());
    const onPreviewChange = (event: Event) => {
      setValue((event as CustomEvent<RolePreview>).detail);
      qc.invalidateQueries({ queryKey: ["current-user"] });
    };
    window.addEventListener("beyond-medicine-role-preview", onPreviewChange);
    return () => window.removeEventListener("beyond-medicine-role-preview", onPreviewChange);
  }, [qc]);

  return (
    <div className={compact ? "w-44" : "max-w-xs space-y-2"}>
      {!compact && <p className="text-sm font-medium text-ink">Preview portal as</p>}
      <Select value={value} onValueChange={(next) => { const preview = next as RolePreview; setRolePreview(preview); setValue(preview); qc.invalidateQueries({ queryKey: ["current-user"] }); }}>
        <SelectTrigger aria-label="Preview portal role"><SelectValue /></SelectTrigger>
        <SelectContent>{ROLE_PREVIEW_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}
