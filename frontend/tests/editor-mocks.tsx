import React from 'react';
export const useParams=()=>({id:'test-report'});
const search=new URLSearchParams();
export const useSearchParams=()=>search;
export const useRouter=()=>({push(){}});
function Section({register}:any){return <input aria-label="Draft file number" {...register('fileNumber')}/>}
export const AddressAndContactSection=Section,PropertyDetailsSection=Section,LocationDetailsSection=Section,PropertyDescriptorsSection=Section,AncillaryImprovementsSection=Section,GeneralCommentsSection=Section,ValuationDetailsSection=Section,ReferralDetailsSection=Section,PhotosSection=Section,ComparablesSection=Section;
export function PreviewReportModal({isOpen,onClose}:any){
  React.useEffect(()=>{if(isOpen)window.editorFixture.events.push('preview')},[isOpen]);
  return isOpen?<div role="dialog"><span>Preview file: {window.editorFixture.report.fileNumber}</span><button onClick={onClose}>Close test preview</button></div>:null;
}
