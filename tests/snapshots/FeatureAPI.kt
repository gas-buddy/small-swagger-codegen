@file:Suppress("unused", "UnusedImport", "EnumEntryName")

package com.gasbuddy.mobile.webservices.rx.webservices

import com.gasbuddy.mobile.webservices.GBIORxWebServices
import com.gasbuddy.mobile.webservices.RxWebServices
import com.google.gson.annotations.SerializedName
import io.reactivex.Single
import io.reactivex.schedulers.Schedulers
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.adapter.rxjava2.RxJava2CallAdapterFactory
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*
import java.time.OffsetDateTime
import okhttp3.MultipartBody


class FeatureAPIWebServices : GBIORxWebServices() {

    //region Companion
    companion object {
        @JvmStatic
        val api: API = Retrofit.Builder()
                .baseUrl(GBIORxWebServices.getHost())
                .addConverterFactory(GsonConverterFactory.create())
                .addCallAdapterFactory(RxJava2CallAdapterFactory.createWithScheduler(Schedulers.io()))
                .client(RxWebServices.httpClient().newBuilder().build())
                .build()
                .create(API::class.java)
    }
    //endregion


    //region Web Services
    interface API {
        
        /**
         * Get a list of features and settings for a given device, user and app
         * @param tag The tag (and its parents) for which features are being requested
         * @param sampleQuery A query parameter
         * @param client Information about the client making the request
         * @return Single<Features>
         */
        @Headers("Content-Type:application/json")
        @POST("/feature/features/{tag}")
        fun getFeatures(
            @HeaderMap headerMap: Map<String, String>,
            @Path("tag") tag: String,
            @Query("sample_query") sampleQuery: String? = null,
            @Body client: ClientData
        ) : Single<Features>
    }
    //endregion


    //region Models
    data class ClientData (
        @SerializedName("locale") val locale: String? = null,  // The locale desired for returned resources 
        @SerializedName("ver") val ver: String? = null,  // The "ver" value returned from a previous call to this API which will cause features having a return_if_before value generated before ver not to be returned 
        @SerializedName("dev") val dev: ClientData.Dev, 
        @SerializedName("app") val app: ClientData.App, 
        @SerializedName("user") val user: ClientData.User? = null, 
        @SerializedName("ctx") val ctx: Map<String, Any>? = null  // Arbitrary key value pairs 
    )  {
    	data class Dev (
    	    @SerializedName("id") val id: String? = null,  // A unique identifier for the device 
    	    @SerializedName("os") val os: String? = null, 
    	    @SerializedName("ver") val ver: String? = null 
    	) 
    
    	data class App (
    	    @SerializedName("id") val id: String? = null, 
    	    @SerializedName("ver") val ver: String? = null, 
    	    @SerializedName("hr") val hr: Double? = null  // Hours since app install 
    	) 
    
    	data class User (
    	    @SerializedName("country") val country: String? = null,  // The country in which the user is acting or to which they are assigned 
    	    @SerializedName("anon_id") val anonId: String? = null  // If the user is not an authenticated user, an anonymous identifier for them (such as a guid) 
    	) 
    
    }
    

    data class Features (
        @SerializedName("ver") val ver: String? = null,  // A version value which should be passed to future calls such that features marked with a "return_if_before" value that comes before ver will not be returned 
        @SerializedName("features") val features: List<FeaturesFeatures>? = null  // A list of feature-variant assignments for the user. Note that if the user is assigned to the "control group" for a feature, no entry will be sent for that feature 
    ) 

    data class FeaturesFeatures (
        @SerializedName("n") val n: String,  // Feature name 
        @SerializedName("r") val r: Boolean? = null,  // FALSE if this feature should not be recorded via analytics events (e.g. we don't need to measure anymore) 
        @SerializedName("v") val v: String? = null,  // Variant for feature. If the variant and feature name are the same, only the feature name will be sent 
        @SerializedName("p") val p: Map<String, Any>? = null,  // Payload for the feature and the variant, if available 
        @SerializedName("l") val l: Map<String, Any>? = null  // Localized resources associated with the variant 
    ) 

    //endregion

    //region Enums
    //endregion
    
}