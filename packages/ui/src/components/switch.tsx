import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "../lib/utils";

export interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> {
  label?: string;
}

const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitive.Root>,
  SwitchProps
>(({ className, label, id, ...props }, ref) => {
  const switchId = id || React.useId();

  const switchElement = (
    <SwitchPrimitive.Root
      id={switchId}
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-200",
        className
      )}
      {...props}
      ref={ref}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform",
          "data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
          "rtl:data-[state=checked]:-translate-x-4 rtl:data-[state=unchecked]:translate-x-0"
        )}
      />
    </SwitchPrimitive.Root>
  );

  if (label) {
    return (
      <div className="flex items-center gap-2">
        {switchElement}
        <label
          htmlFor={switchId}
          className="text-sm font-medium text-gray-700 cursor-pointer peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"
        >
          {label}
        </label>
      </div>
    );
  }

  return switchElement;
});
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
