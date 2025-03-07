import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { HardDrive, LogOut, Menu, Upload, UserCircle, Users } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const Navbar = ({ isAuthenticated, user, logout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.email) return "U";
    return user.email.charAt(0).toUpperCase();
  };

  // Check if a route is active
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="sticky top-0 z-50 border-b bg-primary shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="rounded-md bg-white p-1">
            <HardDrive className="h-6 w-6 text-primary" />
          </div>
          <span className="text-xl font-bold text-primary-foreground">FileShare</span>
        </Link>

        {/* Mobile menu */}
        <Sheet className="md:hidden">
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden text-primary-foreground">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader className="mb-6">
              <SheetTitle>FileShare</SheetTitle>
            </SheetHeader>

            <div className="flex flex-col gap-4">
              {isAuthenticated ? (
                <>
                  <div className="mb-4 flex items-center gap-3 rounded-lg border p-3">
                    <Avatar>
                      <AvatarFallback className="bg-secondary text-secondary-foreground">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user?.name || "User"}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>

                  <Link
                    to="/dashboard"
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
                      isActive("/dashboard") ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    )}
                  >
                    <HardDrive className="h-4 w-4" />
                    Dashboard
                  </Link>

                  <Link
                    to="/files"
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
                      isActive("/files") ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    )}
                  >
                    <Users className="h-4 w-4" />
                    My Files
                  </Link>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex w-full justify-start gap-2 px-3 py-2 font-medium">
                        <Upload className="h-4 w-4" />
                        Send Files
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to="/upload" className="flex items-center gap-2">
                          Cloud Upload
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/transfer/initiate" className="flex items-center gap-2">
                          P2P Transfer
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Link
                    to="/profile"
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
                      isActive("/profile") ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    )}
                  >
                    <UserCircle className="h-4 w-4" />
                    Profile
                  </Link>

                  <Button
                    variant="ghost"
                    className="flex justify-start gap-2 px-3 py-2 text-sm font-medium hover:bg-destructive/10 hover:text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
                  >
                    Login
                  </Link>
                  <Button asChild className="mt-2">
                    <Link to="/register">
                      Create Account
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop menu */}
        <NavigationMenu className="hidden md:block">
          <NavigationMenuList>
            {isAuthenticated ? (
              <>
                <NavigationMenuItem>
                  <Link
                    to="/dashboard"
                    className={cn(
                      "flex items-center gap-1 px-4 py-2 text-primary-foreground transition-colors hover:text-primary-foreground/80",
                      isActive("/dashboard") && "font-medium underline decoration-2 underline-offset-4"
                    )}
                  >
                    <HardDrive className="mr-1 h-4 w-4" />
                    Dashboard
                  </Link>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <Link
                    to="/files"
                    className={cn(
                      "flex items-center gap-1 px-4 py-2 text-primary-foreground transition-colors hover:text-primary-foreground/80",
                      isActive("/files") && "font-medium underline decoration-2 underline-offset-4"
                    )}
                  >
                    <Users className="mr-1 h-4 w-4" />
                    My Files
                  </Link>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <NavigationMenuTrigger className="flex items-center gap-1 text-primary-foreground hover:text-primary-foreground/80">
                    <Upload className="mr-1 h-4 w-4" />
                    Send Files
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid w-48 gap-1 p-3">
                      <NavigationMenuLink asChild>
                        <Link
                          to="/upload"
                          className="block rounded p-2 hover:bg-accent hover:text-accent-foreground"
                        >
                          Cloud Upload
                        </Link>
                      </NavigationMenuLink>
                      <NavigationMenuLink asChild>
                        <Link
                          to="/transfer/initiate"
                          className="block rounded p-2 hover:bg-accent hover:text-accent-foreground"
                        >
                          P2P Transfer
                        </Link>
                      </NavigationMenuLink>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                <NavigationMenuItem>
                  <Link
                    to="/profile"
                    className={cn(
                      "flex items-center gap-1 px-4 py-2 text-primary-foreground transition-colors hover:text-primary-foreground/80",
                      isActive("/profile") && "font-medium underline decoration-2 underline-offset-4"
                    )}
                  >
                    <UserCircle className="mr-1 h-4 w-4" />
                    Profile
                  </Link>
                </NavigationMenuItem>
              </>
            ) : (
              <>
                <NavigationMenuItem>
                  <Link
                    to="/login"
                    className="px-4 py-2 text-primary-foreground hover:text-primary-foreground/80"
                  >
                    Login
                  </Link>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Button asChild variant="secondary" size="sm">
                    <Link to="/register">
                      Create Account
                    </Link>
                  </Button>
                </NavigationMenuItem>
              </>
            )}
          </NavigationMenuList>
        </NavigationMenu>

        {/* User dropdown (desktop only) */}
        {isAuthenticated && (
          <div className="hidden md:block">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar>
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="flex flex-col space-y-1 p-2">
                  <p className="font-medium">{user?.name || "User"}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile">Profile Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/files">My Files</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;