import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { Search, Eye, Archive } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getAllApplications, formatNaira, type AppStatus, type Application } from "@/lib/applications";

const ASSET_BASE = "https://pitchcapital.ng/api/";
function resolveAssetUrl(path?: string | null): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return ASSET_BASE + path.replace(/^\/+/, "");
}

type PositionSearch = { tab?: string; q?: string };

export const Route = createFileRoute("/admin/position-management")({
  head: () => ({ meta: [{ title: "Position Management — Admin" }] }),
  validateSearch: (search: Record<string, unknown>): PositionSearch => ({
    tab: typeof search.tab === "string" ? search.tab : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  component: PositionManagementPage,
});

const TABS: { value: AppStatus; label: string }[] = [
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
  { value: "Completed", label: "Completed" },
];

function finalizedDate(a: Application): string | number {
  return a.reviewedAt || a.reviewed_at || (a as any).completed_at || a.submittedAt || a.submitted_at || 0;
}

function PositionManagementPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const [all, setAll] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const activeTab = (search.tab as AppStatus | undefined) ?? "Approved";
  const activeQuery = search.q ?? "";

  const setSearchParam = (patch: Partial<PositionSearch>) => {
    navigate({
      search: (prev) => {
        const next: PositionSearch = { ...prev, ...patch };
        if (!next.tab || next.tab === "Approved") delete next.tab;
        if (!next.q) delete next.q;
        return next;
      },
      replace: true,
    });
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getAllApplications();
        setAll(data);
      } catch (error) {
        console.error("Failed to fetch applications:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Finalised applications only — the counterpart to the Applications page,
  // which shows everything EXCEPT these three statuses.
  const finalized = useMemo(
    () => all.filter((a) => a.status === "Approved" || a.status === "Rejected" || a.status === "Completed"),
    [all],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { Approved: 0, Rejected: 0, Completed: 0 };
    finalized.forEach((a) => { c[a.status] = (c[a.status] || 0) + 1; });
    return c;
  }, [finalized]);

  const filteredList = useMemo(() => {
    const q = activeQuery.trim().toLowerCase();
    return finalized
      .filter((a) => a.status === activeTab)
      .filter((a) =>
        q
          ? `${a.firstName || a.first_name} ${a.surname} ${a.id} ${a.email}`.toLowerCase().includes(q)
          : true,
      )
      .sort((a, b) => +new Date(finalizedDate(b)) - +new Date(finalizedDate(a)));
  }, [finalized, activeTab, activeQuery]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-3 px-6 py-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Position Management</h1>
        <p className="text-sm text-muted-foreground">
          Finalised applications — Approved, Rejected, and Completed. Archival and oversight only; decisions here are final.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setSearchParam({ tab: v })}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
              <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold leading-none">
                {counts[t.value] || 0}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-4 w-4 text-primary" /> {activeTab} applications
              </CardTitle>
              <CardDescription>{filteredList.length} result{filteredList.length === 1 ? "" : "s"}</CardDescription>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={activeQuery}
                onChange={(e) => setSearchParam({ q: e.target.value })}
                placeholder="Search by name, ID, email"
                className="pl-9 sm:w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredList.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No {activeTab.toLowerCase()} applications match your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date {activeTab}</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredList.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={resolveAssetUrl(a.passport)} alt={a.firstName || a.first_name || ""} />
                            <AvatarFallback>{(a.firstName || a.first_name || "")[0]}{a.surname[0]}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{a.firstName || a.first_name} {a.surname}</div>
                            <div className="truncate text-xs text-muted-foreground">{a.id} • {a.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{a.paypoint || "—"}</TableCell>
                      <TableCell className="font-medium whitespace-nowrap">{formatNaira(a.approvedAmount || a.approved_amount || a.amountRequested || a.amount_requested)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {format(new Date(finalizedDate(a)), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell><StatusBadge status={a.status} /></TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link to="/admin/application/$id" params={{ id: String(a.id) }}>
                            <Eye className="mr-1 h-3.5 w-3.5" /> View
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
