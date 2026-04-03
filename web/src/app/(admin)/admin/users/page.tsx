"use client";

import { useEffect, useState } from "react";
import { Shield, User as UserIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  getAdminUsers,
  adminUpdateUser,
  getAdminUserBuilds,
  adminDeleteBuild,
} from "@/lib/api-client";
import type { UserWithBuildCount, BuildList } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithBuildCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithBuildCount | null>(
    null,
  );
  const [userBuilds, setUserBuilds] = useState<BuildList | null>(null);
  const [buildsLoading, setBuildsLoading] = useState(false);

  useEffect(() => {
    getAdminUsers()
      .then(setUsers)
      .catch(() => toast.error("Failed to load users"))
      .finally(() => setLoading(false));
  }, []);

  async function toggleAdmin(user: UserWithBuildCount) {
    if (user.id === currentUser?.id) {
      toast.error("Cannot change your own role");
      return;
    }
    const newRole = user.role === "admin" ? "user" : "admin";
    try {
      const updated = await adminUpdateUser(user.id, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: updated.role } : u)),
      );
      toast.success(
        `${user.email} is now ${newRole === "admin" ? "an admin" : "a regular user"}`,
      );
    } catch {
      toast.error("Failed to update role");
    }
  }

  async function changeAccountType(
    userId: string,
    account_type: "hobbyist" | "professional",
  ) {
    try {
      await adminUpdateUser(userId, { account_type });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, account_type } : u)),
      );
      toast.success("Account type updated");
    } catch {
      toast.error("Failed to update account type");
    }
  }

  async function changeSubscription(
    userId: string,
    subscription_status: "free" | "per_project" | "subscription",
  ) {
    try {
      await adminUpdateUser(userId, { subscription_status });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, subscription_status } : u)),
      );
      toast.success("Subscription updated");
    } catch {
      toast.error("Failed to update subscription");
    }
  }

  async function openUserBuilds(user: UserWithBuildCount) {
    setSelectedUser(user);
    setBuildsLoading(true);
    try {
      const builds = await getAdminUserBuilds(user.id);
      setUserBuilds(builds);
    } catch {
      toast.error("Failed to load builds");
    } finally {
      setBuildsLoading(false);
    }
  }

  async function deleteBuild(buildId: string) {
    try {
      await adminDeleteBuild(buildId);
      setUserBuilds((prev) =>
        prev
          ? {
              ...prev,
              builds: prev.builds.filter((b) => b.id !== buildId),
              total: prev.total - 1,
            }
          : null,
      );
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser?.id
            ? { ...u, build_count: u.build_count - 1 }
            : u,
        ),
      );
      toast.success("Build deleted");
    } catch {
      toast.error("Failed to delete build");
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-muted-foreground">
          Manage user roles and permissions
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Subscription</TableHead>
              <TableHead>Builds</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.email}</TableCell>
                <TableCell>
                  {u.role === "admin" ? (
                    <Badge className="gap-1">
                      <Shield className="h-3 w-3" />
                      Admin
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <UserIcon className="h-3 w-3 mr-1" />
                      User
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="capitalize">{u.account_type}</TableCell>
                <TableCell className="capitalize">
                  {u.subscription_status.replace("_", " ")}
                </TableCell>
                <TableCell>
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto"
                    onClick={() => openUserBuilds(u)}
                  >
                    {u.build_count}
                  </Button>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(u.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Edit <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        disabled={u.id === currentUser?.id}
                        onClick={() => toggleAdmin(u)}
                      >
                        {u.role === "admin" ? "Remove admin" : "Make admin"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => changeAccountType(u.id, "hobbyist")}
                      >
                        Set: Hobbyist
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => changeAccountType(u.id, "professional")}
                      >
                        Set: Professional
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => changeSubscription(u.id, "free")}
                      >
                        Set: Free
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => changeSubscription(u.id, "per_project")}
                      >
                        Set: Per Project
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => changeSubscription(u.id, "subscription")}
                      >
                        Set: Subscription
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Builds slide-out */}
      <Sheet
        open={!!selectedUser}
        onOpenChange={(open) => {
          if (!open) setSelectedUser(null);
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{selectedUser?.email} — Builds</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-3">
            {buildsLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : userBuilds?.builds.length === 0 ? (
              <p className="text-sm text-muted-foreground">No builds</p>
            ) : (
              userBuilds?.builds.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="text-sm font-medium capitalize">{b.status}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(b.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteBuild(b.id)}
                  >
                    Delete
                  </Button>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
