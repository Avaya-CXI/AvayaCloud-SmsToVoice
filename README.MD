This is meant to serve as an example of a basic Avaya Cloud application that offer a voice call to someone who is texting into a support line.


For the SMS interactions, if the SMS body is '1' then an outbound call is initiated with the configured outbound call number.  Once the outbound call number is connected, a new leg of the call is created which reaches out to the customer.  If the SMS body is not 1, then an SMS is sent back explaining how they could send '1' to be connected to someone.

You will need to fill in some values for the variables at the top of the screen.  In order to get the SMS to work, you will have to set your Request Url for SMS Requests on the Avaya Cloud website to whatever the value of INCOMING_SMS_URL is.


Once you have cloned the repository, go inside of the directory and run 'npm install' to install the proper node libraries.  
After that, simply run 'node app-SmsToVoice.js' and it should say that the application is Listening on the configured port.
