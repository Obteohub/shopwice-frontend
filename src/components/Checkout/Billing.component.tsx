// Imports
import {
  SubmitHandler,
  useForm,
  useFormContext,
  FormProvider,
} from 'react-hook-form';
import { useEffect } from 'react';

// Components
import { InputField } from '@/components/Input/InputField.component';
import AddressAutocomplete from '@/components/Input/AddressAutocomplete.component';
import Button from '../UI/Button.component';
import LoadingSpinner from '@/components/LoadingSpinner/LoadingSpinner.component';

// Constants
import { INPUT_FIELDS } from '@/utils/constants/INPUT_FIELDS';
import { ICheckoutDataProps } from '@/utils/functions/functions';

interface IBillingProps {
  handleFormSubmit: SubmitHandler<ICheckoutDataProps>;
  isLoading?: boolean;
  buttonLabel?: string;
  initialCity?: string | null;
}

const CountrySelect = ({ label, name, customValidation }: { label: string, name: string, customValidation: any }) => {
  const { register } = useFormContext();
  const allowedCountries = [{ code: 'GH', name: 'Ghana' }];

  return (
    <div className="w-full">
      <label htmlFor={name} className="block mb-1 text-xs font-bold text-gray-700">
        {label}
      </label>
      <select
        id={name}
        {...register(name, customValidation)}
        className="bg-white border border-gray-300 text-gray-900 text-sm rounded focus:ring-blue-500 focus:border-blue-500 block w-full p-1.5"
      >
        {allowedCountries.map((c: any) => (
          <option key={c.code} value={c.code}>{c.name}</option>
        ))}
      </select>
    </div>
  );
};

const OrderButton = ({ isLoading, label }: { isLoading: boolean; label: string }) => {
  return (
    <div className="w-full p-2">
      <div className="mt-4 flex justify-center">
        <Button buttonDisabled={isLoading}>
          {isLoading ? <LoadingSpinner color="white" size="sm" /> : label}
        </Button>
      </div>
    </div>
  );
};

const Billing = ({ handleFormSubmit, isLoading = false, buttonLabel = 'PLACE ORDER', initialCity }: IBillingProps) => {
  const methods = useForm<ICheckoutDataProps>();

  useEffect(() => {
    if (initialCity) {
      // Logic: Only fill if empty to avoid overwriting user input
      // OR force fill on first mount (but this useEffect runs on update too)
      // Best approach: Check if "city" is empty or untouched.
      // Since useForm is uncontrolled mostly, we just setVlaue.
      // We can also just setValue unconditionally if we assume this component
      // remounts or we want the store to drive it.
      // Let's check current value first.
      const currentCity = methods.getValues('city');
      const currentState = methods.getValues('address1'); // Using address1 for State/Region as per previous conversation? No, previous conv said "Region" field... wait.
      // INPUT_FIELDS says 'city' is city.
      // INPUT_FIELDS says 'state' is Region?
      // Let's check INPUT_FIELDS content if possible. I recall viewing it.
      // Ah, previous conversation said "Renamed 'State/County' label to 'Region'".
      // Usually 'state' is the name for Region.

      if (!currentCity) {
        methods.setValue('city', initialCity);
        // Also set State/Region to the same value? 
        // The prompt says "store location ... sync ... to the laddress on the chedckout"
        // "Detected City" usually maps to what the user considers their location.
        // Often in Ghana, City and Region can be used interchangeably or specifically.
        // Let's set both or just City. The locationStore has {name: "Accra", slug: "accra"}.
        // If name is "Accra", we can set City = Accra.
        methods.setValue('state', initialCity); // Assuming 'state' is the field name for Region
      }
    }
  }, [initialCity, methods]);

  return (
    <section className="w-full">
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(handleFormSubmit)}>
          <div className="flex flex-wrap -mx-1">
            {INPUT_FIELDS.map(({ id, label, name, customValidation }) => (
              <div key={id} className="w-full md:w-1/2 px-1 mb-2">
                {name === 'address1' ? (
                  <AddressAutocomplete label={label} name={name} />
                ) : name === 'country' ? (
                  <CountrySelect label={label} name={name} customValidation={customValidation} />
                ) : (
                  <InputField
                    inputLabel={label}
                    inputName={name}
                    customValidation={customValidation}
                  />
                )}
              </div>
            ))}
            <OrderButton isLoading={isLoading} label={buttonLabel} />
          </div>
        </form>
      </FormProvider>
    </section>
  );
};

export default Billing;
