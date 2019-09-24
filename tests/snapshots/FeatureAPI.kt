@file:Suppress("unused", "UnusedImport", "EnumEntryName", "RemoveRedundantQualifierName")

package com.gasbuddy.mobile.common.webservices.apis

import com.gasbuddy.mobile.common.interfaces.Jsonable
import com.gasbuddy.mobile.common.webservices.GBIORxWebServices
import com.google.gson.annotations.SerializedName
import io.reactivex.Observable
import io.reactivex.Single
import io.reactivex.schedulers.Schedulers
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.adapter.rxjava2.RxJava2CallAdapterFactory
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*
import org.threeten.bp.OffsetDateTime
import okhttp3.MultipartBody

// @formatter:off
class FeatureAPI : GBIORxWebServices() {

    //region Companion
    companion object {
        @JvmStatic
        val api: API = createAPI(baseUrl = host, clazz = API::class.java)
    }
    //endregion


    //region Web Services
    interface API {
        
        /**
         * Get a list of features and settings for a given device, user and app
         * @param tagName The tag (and its parents) for which features are being requested
         * @param sampleQuery A query parameter
         * @param client Information about the client making the request
         * @return Single<Features>
         */
        @Headers("Content-Type:application/json")
        @POST("/feature/features/{tag_name}")
        @JvmSuppressWildcards
        fun getFeatures(
            @HeaderMap headerMap: Map<String, String>,
            @Path("tag_name") tagName: String,
            @Query("sample_query") sampleQuery: String? = null,
            @Body client: ClientData
        ) : Single<Features>
        
        /**
         * A method with no parameters
         * @return Single<Features>
         */
        @Headers("Content-Type:application/json")
        @GET("/feature/noargs")
        @JvmSuppressWildcards
        fun noargsGet(
            @HeaderMap headerMap: Map<String, String>
        ) : Single<Features>
    }
    //endregion


    //region Models
    open class ClientData (
        @SerializedName("locale") open val locale: String? = null,  // The locale desired for returned resources 
        @SerializedName("ver") open val ver: String? = null,  // The "ver" value returned from a previous call to this API which will cause features having a return_if_before value generated before ver not to be returned 
        @SerializedName("dev") open val dev: ClientData.Dev, 
        @SerializedName("app") open val app: ClientData.App, 
        @SerializedName("user") open val user: ClientData.User? = null, 
        @SerializedName("ctx") open val ctx: Map<String, Any>? = null  // Arbitrary key value pairs 
    ) : Jsonable  {
    
        open class Dev (
            @SerializedName("id") open val id: String? = null,  // A unique identifier for the device 
            @SerializedName("os") open val os: String? = null, 
            @SerializedName("ver") open val ver: String? = null 
        ) : Jsonable 
    
        open class App (
            @SerializedName("id") open val id: String? = null, 
            @SerializedName("ver") open val ver: String? = null, 
            @SerializedName("hr") open val hr: Double? = null  // Hours since app install 
        ) : Jsonable 
    
        open class User (
            @SerializedName("country") open val country: String? = null,  // The country in which the user is acting or to which they are assigned 
            @SerializedName("anon_id") open val anonId: String? = null  // If the user is not an authenticated user, an anonymous identifier for them (such as a guid) 
        ) : Jsonable 
    
    }
    

    open class Features (
        @SerializedName("ver") open val ver: String? = null,  // A version value which should be passed to future calls such that features marked with a "return_if_before" value that comes before ver will not be returned 
        @SerializedName("features") open val features: List<FeaturesFeatures>? = null  // A list of feature-variant assignments for the user. Note that if the user is assigned to the "control group" for a feature, no entry will be sent for that feature 
    ) : Jsonable 

    open class FeaturesFeatures (
        @SerializedName("n") open val n: String,  // Feature name 
        @SerializedName("r") open val r: Boolean? = null,  // FALSE if this feature should not be recorded via analytics events (e.g. we don't need to measure anymore) 
        @SerializedName("v") open val v: String? = null,  // Variant for feature. If the variant and feature name are the same, only the feature name will be sent 
        @SerializedName("p") open val p: Map<String, Any>? = null,  // Payload for the feature and the variant, if available 
        @SerializedName("l") open val l: Map<String, Any>? = null  // Localized resources associated with the variant 
    ) : Jsonable 

    //endregion

    //region Enums
    //endregion
    
}
