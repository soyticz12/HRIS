// src/components/DashboardLayout.tsx
import { useLocation, Outlet, Link } from "react-router-dom"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

type Crumb = { label: string; to?: string }

const breadcrumbMap: Record<string, Crumb[]> = {
  "/dashboard": [{ label: "Dashboard" }],
  "/ar": [{ label: "Acknowledgement Receipt" }],
  "/settings": [{ label: "Settings" }],
  "/preferences": [
    { label: "Settings", to: "/settings" },
    { label: "Preferences" },
  ],
}

export default function DashboardLayout() {
  const location = useLocation()
  const crumbs = breadcrumbMap[location.pathname] ?? [{ label: "Page" }]

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />

            <Breadcrumb>
              <BreadcrumbList>
                {crumbs.map((crumb, idx) => {
                  const isLast = idx === crumbs.length - 1
                  return (
                    // Fragment shorthand avoids needing React import
                    <span key={`${crumb.label}-${idx}`} className="flex items-center">
                      {idx > 0 && <BreadcrumbSeparator className="hidden md:block" />}
                      <BreadcrumbItem>
                        {isLast ? (
                          <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink asChild className="hidden md:block">
                            <Link to={crumb.to ?? "#"}>{crumb.label}</Link>
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </span>
                  )
                })}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
