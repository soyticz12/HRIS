"use client"

import * as React from "react"
import {
  Accessibility,
  AudioWaveform,
  Command,
  Frame,
  GalleryVerticalEnd,
  Home,
  Map,
  PieChart,
  Receipt,
  Settings,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: Command,
      plan: "Free",
    },
  ],
  navMain: [
    //dashboard
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
    },

    {
      title: "Acknowledgement Receipt",
      url: "#",
      icon: Settings,
      items: [
        {
          title: "Task",
          url: "/ar/task",
        },
        {
          title: "AR History",
          url: "/ar/history",
        },
      ],
    },

    //Finance
    {
      title: "Finance",
      url: "#",
      icon: Settings,
      items: [
        {
          title: "Cash Advance",
          url: "/cashadvance",
        },
        {
          title: "Payroll",
          url: "/preferences",
        },
      ],
    },
    //HR
    {
      title: "HR",
      url: "#",
      icon: Settings,
      items: [
        {
          title: "Employees",
          url: "hr/employee",
        },
        {
          title: "Attendance",
          url: "hr/attendance",
        },
      ],
    },
    //Settings
    {
      title: "Settings",
      url: "#",
      icon: Settings,
      items: [
        {
          title: "User Settings",
          url: "/settings/usersettings",
        },
        {
          title: "Preferences",
          url: "/settings/preferences",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: Frame,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Travel",
      url: "#",
      icon: Map,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}