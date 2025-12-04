import { LightningElement, track } from 'lwc'; 
import uploadToDrive from '@salesforce/apex/GoogleDriveConnect.uploadToDrive';
import getPreviewfromdrive from '@salesforce/apex/GoogleDriveConnect.getPreviewfromdrive';
import recordlistofdrive from '@salesforce/apex/GoogleDriveConnect.recordlistofdrive';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

const columns = [
    { label: 'GoogleDriveFileName', fieldName: 'Name', type: 'text' },
    { label: 'Google Drive Id', fieldName: 'Google_Drive_Id__c', type: 'text' },
    { label: 'Created Date', fieldName: 'CreatedDate', type: 'Date' },
    {
        label: 'Preview',
        type: "button",
        typeAttributes: {
            name: 'Preview',
            label: 'Preview',
            title: 'Preview'
        }
    }
];

export default class GoogleDriveUploader extends LightningElement {
    @track fileData;
    @track googleFileId;
    @track columns = columns;
    @track isUploading = false;
    @track preview;

    isImage = false;
    isVideo = false;
    isAny = false;
    isAudio = false;

    connectedCallback() {
        this.isUploading = true;
        recordlistofdrive()
            .then(result => {
                console.log('result', result);
                this.fileData = result;
            })
            .catch(error => {
                console.error(error);
            })
            .finally(() => {
                this.isUploading = false;
            });
    }

    handleFileChange(event) {
        const file = event.target.files[0];
        let reader = new FileReader();

        reader.onload = () => {
            let base64 = reader.result.split(',')[1];
            this.fileData = {
                fileName: file.name,
                base64: base64,
                mimeType: file.type,
            };
        };

        reader.readAsDataURL(file);
    }

    uploadFile() {
        if (!this.fileData) {
            this.showToast('Error', 'Please upload a file first', 'error');
            return;
        }
        this.isUploading = true;

        uploadToDrive({
            fileName: this.fileData.fileName,
            base64Data: this.fileData.base64,
            mimeType: this.fileData.mimeType
        })
            .then(result => {
                console.log('Upload Response', result);

                if (!result) {
                    this.showToast('Error', 'Upload failed: No File ID returned from server', 'error');
                    return;
                }

                this.googleFileId = result;

                this.showToast(
                    'Success',
                    'File uploaded successfully! File ID: ' + result,
                    'success'
                );
            })
            .catch(error => {
                console.log('Error => ', error);
                this.showToast('Error', 'Error uploading file', 'error');
            })
            .finally(() => {
                this.isUploading = false;
            });
    }

    handlePreview(event) {
        window.scrollTo(0, 0);

        const row = event.detail.row;     
        const mimeType = row.FileType__c;  
        this.googleFileId = row.Google_Drive_Id__c;

        if (!this.googleFileId) {
            alert('Please upload a file first');
            return;
        }

        this.isUploading = true;

        getPreviewfromdrive({
            fileId: this.googleFileId
        })
            .then(result => {
                console.log('Preview base64', result);

                if (mimeType.startsWith('image/')) {
                    this.preview = `data:${mimeType};base64,${result}`;
                    this.isImage = true;
                    this.isVideo = false;
                    this.isAny = false;
                }

                else if (mimeType.startsWith('video/')) {
                    const byteChar = atob(result);
                    const byteNo = Array.from(byteChar, c => c.charCodeAt(0));
                    const byteArr = new Uint8Array(byteNo);
                    const blob = new Blob([byteArr], { type: mimeType });
                    const blobUrl = URL.createObjectURL(blob);

                    this.preview = blobUrl;  
                    this.isImage = false;
                    this.isVideo = true;
                    this.isAny = false;
                }

                 else if (mimeType.startsWith('application/pdf')) {
                    const byteChar = atob(result);
                    const byteNo = Array.from(byteChar, c => c.charCodeAt(0));
                    const byteArr = new Uint8Array(byteNo);
                    const blob = new Blob([byteArr], { type: mimeType });

                    const blobUrl = URL.createObjectURL(blob);

                    this.preview = blobUrl;

                    this.isImage = false;
                    this.isVideo = false;
                    this.isAny = true;   
                }
                else if(mimeType.startsWith('audio/')){
                    const byteChar = atob(result);
                    const byteNo = Array.from(byteChar, c => c.charCodeAt(0));
                    const byteArr = new Uint8Array(byteNo);
                    const blob = new Blob([byteArr], { type: mimeType });
                    const blobUrl = URL.createObjectURL(blob);
                    console.log('blobUrl',blobUrl);
                    // window.open(blobUrl);

                    this.preview = blobUrl;
                    this.isImage = false;
                    this.isVideo = false;
                    this.isAudio = true;
                    this.isAny = false;
                }
                else{
                    const byteChar = atob(result);
                    const byteNo = Array.from(byteChar, c => c.charCodeAt(0));
                    const byteArr = new Uint8Array(byteNo);
                    const blob = new Blob([byteArr], { type: mimeType });
                    const blobUrl = URL.createObjectURL(blob);

                    // window.open(blobUrl);

                    this.preview = blobUrl;

                    this.isImage = false;
                    this.isVideo = false;
                    this.isAudio = false;
                    this.isAny = true;
                }

            })
            .catch(error => {
                console.log('Error => ', error);
                this.showToast('Error', 'Error fetching preview', 'error');
            })
            .finally(() => {
                this.isUploading = false;
            });
    }

    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title: title,
                message: message,
                variant: variant
            })
        );
    }
}
