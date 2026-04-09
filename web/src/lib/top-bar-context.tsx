"use client";

import { createContext, useContext, useState } from "react";

interface Tab {
  value: string;
  label: string;
}

interface TopBarTabsContextType {
  tabs: Tab[];
  activeTab: string;
  setTabs: (tabs: Tab[], defaultTab: string) => void;
  setActiveTab: (value: string) => void;
  clearTabs: () => void;
}

const TopBarTabsContext = createContext<TopBarTabsContextType>({
  tabs: [],
  activeTab: "",
  setTabs: () => {},
  setActiveTab: () => {},
  clearTabs: () => {},
});

export function TopBarTabsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [tabs, setTabsState] = useState<Tab[]>([]);
  const [activeTab, setActiveTab] = useState("");

  function setTabs(newTabs: Tab[], defaultTab: string) {
    setTabsState(newTabs);
    setActiveTab(defaultTab);
  }

  function clearTabs() {
    setTabsState([]);
    setActiveTab("");
  }

  return (
    <TopBarTabsContext.Provider
      value={{ tabs, activeTab, setTabs, setActiveTab, clearTabs }}
    >
      {children}
    </TopBarTabsContext.Provider>
  );
}

export function useTopBarTabs() {
  return useContext(TopBarTabsContext);
}
