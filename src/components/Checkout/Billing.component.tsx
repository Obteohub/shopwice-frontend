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
import {
  GHANA_REGION_OPTIONS,
  normalizeGhanaRegionName,
} from '@/utils/constants/REGIONS';
import { ICheckoutDataProps } from '@/utils/functions/functions';

interface IBillingProps {
  handleFormSubmit: SubmitHandler<ICheckoutDataProps>;
  isLoading?: boolean;
  buttonLabel?: string;
  initialCity?: string | null;
}

const CountrySelect = ({ label, name, customValidation }: { label: string; name: string; customValidation: any }) => {
  const { register } = useFormContext();
  const allowedCountries = [{ code: 'GH', name: 'Ghana' }];

  return (
    <div className="w-full">
      <label htmlFor={name} className="block mb-1 text-xs font-bold text-gray-700">
        {label}
      </label>
      <select
        id={name}
        defaultValue="GH"
        {...register(name, customValidation)}
        className="bg-white border border-gray-300 text-gray-900 text-sm rounded focus:ring-blue-500 focus:border-blue-500 block w-full p-1.5"
      >
        {allowedCountries.map((c) => (
          <option key={c.code} value={c.code}>{c.name}</option>
        ))}
      </select>
    </div>
  );
};

const RegionSelect = ({
  label,
  name,
  customValidation,
}: {
  label: string;
  name: string;
  customValidation: any;
}) => {
  const { register } = useFormContext();

  return (
    <div className="w-full">
      <label htmlFor={name} className="block mb-1 text-xs font-bold text-gray-700">
        {label}
      </label>
      <select
        id={name}
        defaultValue=""
        {...register(name, customValidation)}
        className="bg-white border border-gray-300 text-gray-900 text-sm rounded focus:ring-blue-500 focus:border-blue-500 block w-full p-1.5"
      >
        <option value="">Select your region</option>
        {GHANA_REGION_OPTIONS.map((region) => (
          <option key={region.code} value={region.name}>
            {region.name}
          </option>
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
  const { setValue, getValues } = methods;

  useEffect(() => {
    if (!initialCity) return;

    if (!getValues('city')) {
      setValue('city', initialCity);
    }
  }, [initialCity, setValue, getValues]);

  useEffect(() => {
    const currentState = getValues('state');
    if (!currentState) return;
    const normalizedName = normalizeGhanaRegionName(String(currentState));
    if (normalizedName !== currentState) {
      setValue('state', normalizedName);
    }
  }, [getValues, setValue]);

  return (
    <section className="w-full">
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(handleFormSubmit)}>
          <div className="flex flex-wrap -mx-1">
            {INPUT_FIELDS.map(({ id, label, name, customValidation }) => (
              <div key={id} className="w-full md:w-1/2 px-1 mb-2">
                {name === 'address1' ? (
                  <AddressAutocomplete label={label} name={name} autoLocateOnMount={true} />
                ) : name === 'country' ? (
                  <CountrySelect label={label} name={name} customValidation={customValidation} />
                ) : name === 'state' ? (
                  <RegionSelect label={label} name={name} customValidation={customValidation} />
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
