export function getTechnicianRoleBadgeClass(role: string) {
  if (role === "admin") return "badge-danger";
  if (role === "gestionnaire") return "bg-red-100 text-red-900";
  return "badge-info";
}
