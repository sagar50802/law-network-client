// src/components/ui/tabs.jsx
import * as React from "react";

export function Tabs({ defaultValue, children, className = "" }) {
  const [value, setValue] = React.useState(defaultValue);
  const context = { value, setValue };
  return (
    <TabsContext.Provider value={context}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className = "" }) {
  return <div className={`flex space-x-2 ${className}`}>{children}</div>;
}

export function TabsTrigger({ value, children, className = "" }) {
  const { value: active, setValue } = React.useContext(TabsContext);
  const activeStyle =
    active === value
      ? "bg-purple-600 text-white border-purple-600"
      : "bg-white text-purple-700 border border-purple-300 hover:bg-purple-50";
  return (
    <button
      onClick={() => setValue(value)}
      className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeStyle} ${className}`}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className = "" }) {
  const { value: active } = React.useContext(TabsContext);
  if (active !== value) return null;
  return <div className={`mt-4 ${className}`}>{children}</div>;
}

const TabsContext = React.createContext({});
