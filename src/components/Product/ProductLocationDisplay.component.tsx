import { useLocationStore } from '@/stores/locationStore';

type RestLocation = {
  id?: number | string;
  name: string;
  slug?: string;
};

interface ProductLocationDisplayProps {
  locations?: RestLocation[] | null;
}

export default function ProductLocationDisplay({
  locations,
}: ProductLocationDisplayProps) {
  const { selectedLocation } = useLocationStore();

  if (!locations || locations.length === 0) {
    return null;
  }

  // If user has selected a location, show that
  if (selectedLocation?.name) {
    return (
      <div className="text-sm text-gray-600">
        <span className="font-semibold">Available in:</span>{' '}
        {selectedLocation.name}
      </div>
    );
  }

  // Otherwise show first product location or fallback
  const locationNames = locations.map((l) => l.name).filter(Boolean);

  return (
    <div className="text-sm text-gray-600">
      <span className="font-semibold">Available in:</span>{' '}
      {locationNames.length === 1 ? locationNames[0] : 'Multiple locations'}
    </div>
  );
}
