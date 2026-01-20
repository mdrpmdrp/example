function testFormSubmit_Baxter() {
  var form = FormApp.openById('1JMKlmjHdyxIzoxK-WjogkGFn7OqG0TYTymrG0yJ2ivw');
  var responses = form.getResponses();
  var latestResponse = responses[responses.length - 1];
  var itemResponses = latestResponse.getItemResponses();
  
  for (var i = 0; i < itemResponses.length; i++) {
    var itemResponse = itemResponses[i];
    Logger.log('Response to question "%s" was "%s" type "%s"', itemResponse.getItem().getTitle(), itemResponse.getResponse(), typeof itemResponse.getResponse());
  }
}