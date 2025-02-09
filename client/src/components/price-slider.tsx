import { Slider } from "@/components/ui/slider";

interface PriceSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export default function PriceSlider({ value, onChange }: PriceSliderProps) {
  return (
    <Slider
      value={[value]}
      min={0}
      max={value * 2}
      step={0.01}
      onValueChange={(values) => onChange(values[0])}
      className="flex-1"
    />
  );
}
