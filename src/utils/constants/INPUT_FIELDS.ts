export const INPUT_FIELDS = [
  {
    id: 0,
    label: 'First Name',
    name: 'firstName',
    customValidation: { required: true, minLength: 2 },
  },
  {
    id: 1,
    label: 'Last Name',
    name: 'lastName',
    customValidation: { required: true, minLength: 2 },
  },
  {
    id: 2,
    label: 'Address',
    name: 'address1',
    customValidation: { required: true, minLength: 4 },
  },
  {
    id: 3,
    label: 'Country',
    name: 'country',
    customValidation: { required: true },
  },
  {
    id: 4,
    label: 'Region',
    name: 'state',
    customValidation: { required: true },
  },
  {
    id: 5,
    label: 'City',
    name: 'city',
    customValidation: { required: true, minLength: 2 },
  },
  {
    id: 6,
    label: 'Postcode',
    name: 'postcode',
    customValidation: { required: false },
  },
  {
    id: 7,
    label: 'Email',
    name: 'email',
    customValidation: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
  },
  {
    id: 8,
    label: 'Phone',
    name: 'phone',
    customValidation: { required: true, minLength: 8, pattern: /^\+?[0-9]{8,12}$/ },
  },
];