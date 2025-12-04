public with sharing class GoogleDriveConnect {
    
    @AuraEnabled
    public static String uploadToDrive(String fileName, String base64Data, String mimeType) {
        try {

           String boundary = 'divider';
           String header = '--' + boundary + '\r\n' +
                'Content-Disposition: form-data; name="file"; filename="' + fileName + '"\r\n' +
                'Content-Type: ' + mimeType + '\r\n\r\n';
           String footer = '\r\n--' + boundary + '--';
           MetaDataValidation__mdt MDT = [SELECT Password__c,UserName__c FROM MetaDataValidation__mdt];
		   String Author = MDT.UserName__c+':'+MDT.Password__c;

           Blob fileContentBlob = EncodingUtil.base64Decode(base64Data);
           String bodyHex = EncodingUtil.convertToHex(Blob.valueOf(header)) +
                             EncodingUtil.convertToHex(fileContentBlob) +
                             EncodingUtil.convertToHex(Blob.valueOf(footer)); 

           Blob finalBodyBlob = EncodingUtil.convertFromHex(bodyHex); 
           HttpRequest req = new HttpRequest();
           req.setEndpoint('https://salesforcedriveintegration-c1jl7w.5sc6y6-2.usa-e2.cloudhub.io/api/files');
           req.setMethod('POST');
           req.setHeader('Content-Type', 'multipart/form-data; boundary=' + boundary); 
           req.setHeader('Content-Length', String.valueOf(finalBodyBlob.size())); 

        
           String encoded = EncodingUtil.base64Encode(Blob.valueOf(Author));
           req.setHeader('Authorization', 'Basic ' + encoded); 
           
           req.setBodyAsBlob(finalBodyBlob);
           Http http = new Http();
           HttpResponse res = http.send(req);
           System.debug('Response Status: ' + res.getStatus()); 
           System.debug('Response Body: ' + res.getBody()); 

            if (res.getStatusCode() == 200){
                Map<String, Object> result = (Map<String, Object>) JSON.deserializeUntyped(res.getBody());
                String googleFileId = (String) result.get('id');
                
                InsertRecord(fileName,mimeType,googleFileId);
                System.debug('Response: '+ res.getBody());

                // Return only fileId
                return googleFileId;
            }
            return null;
        } catch (Exception e) {
            return 'Error: ' + e.getMessage() + e.getLineNumber();
        }
    }

    public static void InsertRecord(String fileName,String mimeType,String googleFileId){
        try{
            GoogleDriveFiles__c gdf = new GoogleDriveFiles__c(
                Name = fileName,
                Google_Drive_Id__c = googleFileId,
                FileType__c = mimeType
            );
            insert gdf;
        }
        catch(Exception e){
            System.debug('error');
        }
    }

    @AuraEnabled
    public static string getPreviewfromdrive(String fileId){
        try {
            HttpRequest req = new HttpRequest();
            req.setEndpoint('https://googlefilepreview-c1jl7w.5sc6y6-4.usa-e2.cloudhub.io/api/files?'+fileId);
            req.setMethod('GET');

            Http http = new Http();
            HttpResponse res = http.send(req);
			system.debug('response'+res.getbody());

            if (res.getStatusCode() == 200) {
                Blob fileBlob = res.getBodyAsBlob();
                return EncodingUtil.base64Encode(fileBlob);
            } else {
                throw new AuraHandledException('Error fetching file: ' + res.getBody());
            }
        }
        catch(Exception e){
            return 'Error: ' + e.getMessage() + e.getLineNumber();
        }
    } 

    @AuraEnabled( cacheable = true )  
    public static List< GoogleDriveFiles__c > recordlistofdrive(){
        return [SELECT Google_Drive_Id__c,Name,FileType__c ,CreatedDate 
                FROM GoogleDriveFiles__c 
                ORDER BY CreatedDate DESC];
    }
}


