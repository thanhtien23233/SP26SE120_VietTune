import MetadataStepSection from '@/components/features/upload/steps/MetadataStepSection';

type UploadFormFieldsProps = React.ComponentProps<typeof MetadataStepSection>;

export default function UploadFormFields(props: UploadFormFieldsProps) {
  return <MetadataStepSection {...props} />;
}
