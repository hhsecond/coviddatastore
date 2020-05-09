import axios from "axios";
import { API_URL } from "../settings";

function saveAnnotationApi(payload){
	return axios
      // .post(API_URL + "/sia/update", payload)
      .post(API_URL + "/sia/update", payload)
      .then(response => {
        return response;
      })
      .catch(e => {
        return e;
      });
}

export {saveAnnotationApi}